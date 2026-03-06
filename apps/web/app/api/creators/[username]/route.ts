import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@foleio/database';
import { z } from 'zod';

const prisma = new PrismaClient();

const paramsSchema = z.object({
  username: z.string().min(1),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = paramsSchema.parse(await params);

    const creator = await prisma.creator.findUnique({
      where: { username, isPublic: true },
      include: {
        creatorPlans: {
          where: { isActive: true },
          orderBy: { orderIndex: 'asc' },
        },
        content: {
          where: { isPublished: true },
          select: {
            id: true,
            title: true,
            description: true,
            type: true,
            thumbnailUrl: true,
            viewCount: true,
            createdAt: true,
            accessType: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!creator) {
      return NextResponse.json(
        { error: 'Creator not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ creator });
  } catch (error) {
    console.error('Error fetching creator:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

