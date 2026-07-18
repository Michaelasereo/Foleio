'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  adminInputClass,
  adminMutedClass,
  adminPanelClass,
  adminTableCellClass,
  adminTableClass,
  adminTableContainerClass,
  adminTableHeadClass,
  adminTableHeadingRowClass,
  adminTableRowClass,
} from '@/lib/admin/format';

type CreatorLinkRow = {
  id: string;
  label: string;
  url: string;
  linkType: string;
};

type CreatorLinksGroup = {
  id: string;
  username: string;
  displayName: string;
  linkCount: number;
  links: CreatorLinkRow[];
};

export default function AdminCreatorLinksPage() {
  const [creators, setCreators] = useState<CreatorLinksGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoadError(null);
    const response = await fetch('/api/admin/creators/links', { cache: 'no-store' });
    if (!response.ok) {
      setLoadError('Could not load creator links.');
      setLoading(false);
      return;
    }
    const data = (await response.json()) as { creators: CreatorLinksGroup[] };
    setCreators(data.creators || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return creators;
    return creators.filter((creator) => {
      if (
        creator.displayName.toLowerCase().includes(q) ||
        creator.username.toLowerCase().includes(q)
      ) {
        return true;
      }
      return creator.links.some(
        (link) =>
          link.label.toLowerCase().includes(q) ||
          link.url.toLowerCase().includes(q) ||
          link.linkType.toLowerCase().includes(q)
      );
    });
  }, [creators, search]);

  const totalLinks = useMemo(
    () => filtered.reduce((sum, creator) => sum + creator.linkCount, 0),
    [filtered]
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="foleio-admin-title">Creator links</h1>
          <p className={`foleio-admin-meta ${adminMutedClass}`}>
            Profiles and external links for each creator
          </p>
        </div>
        <Button
          asChild
          size="sm"
          variant="outline"
          className="border-white/10 bg-transparent text-[#f4f4f5]"
        >
          <Link href="/admin/creators">Back to creators</Link>
        </Button>
      </div>

      <div className={`${adminPanelClass} flex flex-wrap items-center justify-between gap-3`}>
        <Badge variant="outline" className="border-white/10 text-[#adadad]">
          {filtered.length} creator{filtered.length === 1 ? '' : 's'} · {totalLinks}{' '}
          link{totalLinks === 1 ? '' : 's'}
        </Badge>
        <Input
          placeholder="Search creator or link"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`w-64 ${adminInputClass}`}
        />
      </div>

      {loading ? (
        <p className={`text-sm ${adminMutedClass}`}>Loading creator links…</p>
      ) : null}

      {loadError ? (
        <div className={`${adminPanelClass} py-8 text-center text-sm text-red-300`}>
          {loadError}
        </div>
      ) : null}

      {!loading && !loadError && filtered.length === 0 ? (
        <div className={`${adminPanelClass} py-10 text-center ${adminMutedClass}`}>
          {search ? 'No creators match your search.' : 'No creator links yet.'}
        </div>
      ) : null}

      {!loading && !loadError && filtered.length > 0 ? (
        <div className="space-y-4">
          {filtered.map((creator) => (
            <div key={creator.id} className={adminPanelClass}>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-[#f4f4f5]">
                    {creator.displayName}
                  </p>
                  <p className={`text-xs ${adminMutedClass}`}>@{creator.username}</p>
                </div>
                <Badge variant="outline" className="border-white/10 text-[#adadad]">
                  {creator.linkCount} link{creator.linkCount === 1 ? '' : 's'}
                </Badge>
              </div>

              <div className={adminTableContainerClass}>
                <table className={adminTableClass}>
                  <thead className={adminTableHeadClass}>
                    <tr className={adminTableHeadingRowClass}>
                      <th className={adminTableCellClass}>Label</th>
                      <th className={adminTableCellClass}>Type</th>
                      <th className={adminTableCellClass}>URL</th>
                      <th className={adminTableCellClass}>Open</th>
                    </tr>
                  </thead>
                  <tbody>
                    {creator.links.map((link) => (
                      <tr key={link.id} className={adminTableRowClass}>
                        <td className={adminTableCellClass}>{link.label}</td>
                        <td className={adminTableCellClass}>
                          <span className={`text-xs ${adminMutedClass}`}>
                            {link.linkType}
                          </span>
                        </td>
                        <td className={adminTableCellClass}>
                          <span className="block max-w-[360px] truncate text-sm text-[#adadad]">
                            {link.url}
                          </span>
                        </td>
                        <td className={adminTableCellClass}>
                          <Button
                            asChild
                            size="sm"
                            variant="outline"
                            className="border-white/10 bg-transparent"
                          >
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                              Open
                            </a>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
