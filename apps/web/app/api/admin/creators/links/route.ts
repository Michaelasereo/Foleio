import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@foleio/database';
import { isAdminAuthed } from '@/lib/admin/auth';
import {
  cleanSocialUrl,
  resolveInstagramHref,
  resolveTiktokHref,
} from '@/lib/creator/social-urls';

function externalUrl(raw: string | null | undefined): string | null {
  const value = raw?.trim() || '';
  if (!value || value === '#price-list') return null;
  return cleanSocialUrl(value) || (/^https?:\/\//i.test(value) ? value : `https://${value}`);
}

export async function GET(request: NextRequest) {
  try {
    if (!isAdminAuthed(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, '') || 'https://foleio.com';

    const creators = await prisma.creator.findMany({
      select: {
        id: true,
        username: true,
        displayName: true,
        instagramHandle: true,
        tiktokHandle: true,
        creatorLinks: {
          where: { isActive: true },
          orderBy: { orderIndex: 'asc' },
          select: {
            id: true,
            label: true,
            url: true,
            linkType: true,
          },
        },
      },
      orderBy: { displayName: 'asc' },
    });

    const rows = creators
      .map((creator) => {
        const links: Array<{
          id: string;
          label: string;
          url: string;
          linkType: string;
        }> = [];

        links.push({
          id: `profile-${creator.id}`,
          label: 'Foleio profile',
          url: `${appUrl}/creator/${creator.username}`,
          linkType: 'profile',
        });

        const instagram = resolveInstagramHref(creator.instagramHandle);
        if (instagram) {
          links.push({
            id: `instagram-${creator.id}`,
            label: 'Instagram',
            url: instagram,
            linkType: 'instagram',
          });
        }

        const tiktok = resolveTiktokHref(creator.tiktokHandle);
        if (tiktok) {
          links.push({
            id: `tiktok-${creator.id}`,
            label: 'TikTok',
            url: tiktok,
            linkType: 'tiktok',
          });
        }

        for (const link of creator.creatorLinks) {
          const url = externalUrl(link.url);
          if (!url) continue;
          links.push({
            id: link.id,
            label: link.label || link.linkType || 'Link',
            url,
            linkType: link.linkType || 'custom',
          });
        }

        return {
          id: creator.id,
          username: creator.username,
          displayName: creator.displayName,
          linkCount: links.length,
          links,
        };
      })
      .filter((row) => row.links.length > 0);

    return NextResponse.json({ creators: rows });
  } catch (error) {
    console.error('Admin creator links route error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch creator links' },
      { status: 500 }
    );
  }
}
