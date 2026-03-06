import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@foleio/database';
import { z } from 'zod';
import { cookies } from 'next/headers';

const verifyCodeSchema = z.object({
  contentId: z.string().uuid().optional(),
  collectionId: z.string().uuid().optional(),
  email: z.string().email(),
  code: z.string().length(6),
}).refine(data => data.contentId || data.collectionId, {
  message: 'Either contentId or collectionId must be provided',
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = verifyCodeSchema.parse(body);

    // Find the code based on contentId or collectionId
    const accessCode = await prisma.premiumAccessCode.findFirst({
      where: {
        ...(validatedData.contentId && { contentId: validatedData.contentId }),
        ...(validatedData.collectionId && { collectionId: validatedData.collectionId }),
        email: validatedData.email.toLowerCase(),
        code: validatedData.code,
      },
    });

    if (!accessCode) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      );
    }

    // Check if already verified
    if (accessCode.verified) {
      return NextResponse.json(
        { error: 'This code has already been used' },
        { status: 400 }
      );
    }

    // Check if expired
    if (accessCode.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Verification code has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Mark as verified
    await prisma.premiumAccessCode.update({
      where: { id: accessCode.id },
      data: {
        verified: true,
        verifiedAt: new Date(),
      },
    });

    // Handle content verification
    if (validatedData.contentId) {
      const content = await prisma.content.findUnique({
        where: { id: validatedData.contentId },
        select: { collectionId: true },
      });

      if (content?.collectionId) {
        return NextResponse.json(
          {
            error: 'Collection videos are unlocked via collection access only.',
            collectionId: content.collectionId,
          },
          { status: 400 }
        );
      }

      // Increment view count for the content
      await prisma.content.update({
        where: { id: validatedData.contentId },
        data: {
          viewCount: {
            increment: 1,
          },
        },
      });
    }

    // Handle collection verification
    if (validatedData.collectionId) {
      // Increment view count for the collection
      await prisma.collection.update({
        where: { id: validatedData.collectionId },
        data: {
          viewCount: {
            increment: 1,
          },
        },
      });
    }

    // Set a cookie to remember the verified access
    const cookieStore = await cookies();
    const existingAccess = cookieStore.get('premium_access');
    let accessList: { 
      contentId?: string; 
      collectionId?: string; 
      email: string; 
      verifiedAt: number 
    }[] = [];

    if (existingAccess) {
      try {
        accessList = JSON.parse(existingAccess.value);
      } catch {
        accessList = [];
      }
    }

    // Add new verification
    accessList.push({
      ...(validatedData.contentId && { contentId: validatedData.contentId }),
      ...(validatedData.collectionId && { collectionId: validatedData.collectionId }),
      email: validatedData.email.toLowerCase(),
      verifiedAt: Date.now(),
    });

    // Keep only last 50 verifications and remove entries older than 24 hours
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    accessList = accessList
      .filter((item) => item.verifiedAt > oneDayAgo)
      .slice(-50);

    // Create response with cookie
    const response = NextResponse.json({
      success: true,
      message: 'Access granted',
      type: validatedData.collectionId ? 'collection' : 'content',
    });

    response.cookies.set('premium_access', JSON.stringify(accessList), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Verify code error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message || 'Validation failed' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Verification failed' },
      { status: 500 }
    );
  }
}
