'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { BadgeCheck, Search } from 'lucide-react';
import { RemoteImage } from '@/components/creator/RemoteImage';

type CreatorCard = {
  id: string;
  username: string;
  displayName: string;
  bio: string | null;
  category: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  isSample?: boolean;
};

const SAMPLE_CREATOR: CreatorCard = {
  id: 'sample',
  username: 'shosglam',
  displayName: 'Sho’s Glam',
  bio: 'Bridal & soft glam in Lagos — book a session or shop products from one page.',
  category: 'Makeup',
  avatarUrl: null,
  bannerUrl: null,
  isSample: true,
};

const CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'makeup', label: 'Makeup' },
  { value: 'hair', label: 'Hair' },
  { value: 'fashion', label: 'Fashion' },
  { value: 'fitness', label: 'Fitness' },
  { value: 'photography', label: 'Photography' },
];

export function CreatorsDiscovery() {
  const [creators, setCreators] = useState<CreatorCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchCreators = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
        category: selectedCategory,
        ...(searchQuery.trim() ? { search: searchQuery.trim() } : {}),
      });

      const response = await fetch(`/api/creators?${params}`);
      const data = await response.json();
      const list = Array.isArray(data.creators) ? data.creators : [];

      setCreators(
        list.map((creator: CreatorCard) => ({
          id: creator.id,
          username: creator.username,
          displayName: creator.displayName,
          bio: creator.bio,
          category: creator.category,
          avatarUrl: creator.avatarUrl,
          bannerUrl: creator.bannerUrl,
        }))
      );
      setTotalPages(Number(data.pagination?.pages) || 1);
      setCurrentPage(Number(data.pagination?.page) || page);
      setTotalCount(Number(data.pagination?.total) || list.length);
    } catch (error) {
      console.error('Failed to fetch creators:', error);
      setCreators([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchCreators(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory]);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    void fetchCreators(1);
  };

  const showSample = !loading && creators.length === 0;
  const displayList = showSample ? [SAMPLE_CREATOR] : creators;

  return (
    <div className="foleio-mkt-discover">
      <style
        dangerouslySetInnerHTML={{
          __html: `
.foleio-mkt-discover { display: grid; gap: 24px; }
.foleio-mkt-discover-tools {
  display: grid; gap: 14px;
}
.foleio-mkt-discover-search {
  display: flex; gap: 8px; align-items: center;
}
.foleio-mkt-discover-search input {
  flex: 1; min-height: 44px; padding: 0 14px 0 40px;
  border-radius: 10px; border: 1px solid rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.04); color: #fafafa;
  font: inherit; font-size: 14px;
}
.foleio-mkt-discover-search input::placeholder { color: #828282; }
.foleio-mkt-discover-search-wrap { position: relative; flex: 1; }
.foleio-mkt-discover-search-wrap svg {
  position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
  width: 16px; height: 16px; color: #828282; pointer-events: none;
}
.foleio-mkt-discover-search button {
  min-height: 44px; padding: 0 16px; border-radius: 10px;
  border: 1px solid #fff; background: #fff; color: #001035;
  font: inherit; font-size: 14px; font-weight: 600; cursor: pointer;
}
.foleio-mkt-discover-cats {
  display: flex; flex-wrap: wrap; gap: 8px;
}
.foleio-mkt-discover-cat {
  min-height: 34px; padding: 0 12px; border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.14);
  background: transparent; color: #adadad;
  font: inherit; font-size: 13px; font-weight: 500; cursor: pointer;
}
.foleio-mkt-discover-cat[data-active="true"] {
  border-color: #fff; background: rgba(255,255,255,0.1); color: #fafafa;
}
.foleio-mkt-discover-meta {
  margin: 0; color: #828282; font-size: 13px;
}
.foleio-mkt-discover-grid {
  display: grid; gap: 16px;
  grid-template-columns: repeat(1, minmax(0, 1fr));
}
@media (min-width: 720px) {
  .foleio-mkt-discover-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (min-width: 1024px) {
  .foleio-mkt-discover-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
.foleio-mkt-creator-card {
  display: flex; flex-direction: column;
  border-radius: 14px; overflow: hidden;
  border: 1px solid rgba(255,255,255,0.1);
  background: #212121; text-decoration: none; color: inherit;
  transition: border-color 0.15s ease, transform 0.15s ease;
}
.foleio-mkt-creator-card:hover {
  border-color: rgba(255,255,255,0.22);
  transform: translateY(-1px);
}
.foleio-mkt-creator-banner {
  position: relative; height: 120px;
  background: linear-gradient(135deg, #2b2b2b, #3a3530);
}
.foleio-mkt-creator-banner img {
  width: 100%; height: 100%; object-fit: cover; display: block;
}
.foleio-mkt-creator-sample {
  position: absolute; top: 10px; right: 10px;
  padding: 4px 8px; border-radius: 999px;
  background: rgba(0,0,0,0.55); color: #fafafa;
  font-size: 11px; font-weight: 600;
}
.foleio-mkt-creator-body {
  padding: 0 16px 16px;
  display: grid;
  gap: 10px;
}
.foleio-mkt-creator-avatar-row {
  margin-top: -28px;
  position: relative;
  z-index: 1;
}
.foleio-mkt-creator-avatar {
  width: 56px; height: 56px; border-radius: 999px; overflow: hidden;
  border: 2px solid #212121; background: #2b2b2b;
}
.foleio-mkt-creator-avatar img,
.foleio-mkt-creator-avatar span {
  width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
  object-fit: cover; font-size: 18px; font-weight: 600; color: #fafafa;
}
.foleio-mkt-creator-identity {
  min-width: 0;
  padding-top: 2px;
}
.foleio-mkt-creator-name {
  margin: 0; font-size: 16px; font-weight: 600; color: #fafafa; line-height: 1.3;
  display: inline-flex; align-items: center; gap: 6px;
  max-width: 100%;
}
.foleio-mkt-creator-name span {
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.foleio-mkt-creator-name svg {
  width: 16px; height: 16px; flex-shrink: 0; color: #60a5fa;
}
.foleio-mkt-creator-handle {
  margin: 4px 0 0; font-size: 13px; color: #828282;
}
.foleio-mkt-creator-bio {
  margin: 0; font-size: 13px; line-height: 1.45; color: #adadad;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.foleio-mkt-creator-cat {
  justify-self: start; padding: 4px 10px; border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.12); color: #adadad;
  font-size: 12px; font-weight: 500;
}
.foleio-mkt-creator-cta {
  margin-top: 2px; min-height: 40px; border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.2); background: transparent;
  color: #fafafa; font: inherit; font-size: 13px; font-weight: 600;
  display: inline-flex; align-items: center; justify-content: center;
}
.foleio-mkt-creator-card:hover .foleio-mkt-creator-cta {
  border-color: #fff; background: #fff; color: #001035;
}
.foleio-mkt-discover-pager {
  display: flex; justify-content: center; gap: 8px; flex-wrap: wrap;
}
.foleio-mkt-discover-pager button {
  min-height: 36px; min-width: 36px; padding: 0 12px; border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.14); background: transparent;
  color: #adadad; font: inherit; font-size: 13px; cursor: pointer;
}
.foleio-mkt-discover-pager button[data-active="true"] {
  border-color: #fff; color: #fafafa; background: rgba(255,255,255,0.08);
}
.foleio-mkt-discover-pager button:disabled { opacity: 0.4; cursor: not-allowed; }
`,
        }}
      />

      <div className="foleio-mkt-discover-tools">
        <form className="foleio-mkt-discover-search" onSubmit={handleSearch}>
          <div className="foleio-mkt-discover-search-wrap">
            <Search strokeWidth={1.75} />
            <input
              type="search"
              placeholder="Search Pro creators…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search creators"
            />
          </div>
          <button type="submit">Search</button>
        </form>

        <div className="foleio-mkt-discover-cats" role="tablist" aria-label="Categories">
          {CATEGORIES.map((category) => (
            <button
              key={category.value}
              type="button"
              role="tab"
              className="foleio-mkt-discover-cat"
              data-active={selectedCategory === category.value ? 'true' : undefined}
              onClick={() => {
                setSelectedCategory(category.value);
                setCurrentPage(1);
              }}
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>

      <p className="foleio-mkt-discover-meta">
        {loading
          ? 'Loading creators…'
          : showSample
            ? 'No live Pro creators yet — sample card below shows how listings appear.'
            : `${totalCount} Pro creator${totalCount === 1 ? '' : 's'}`}
      </p>

      <div className="foleio-mkt-discover-grid">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="foleio-mkt-creator-card"
                aria-hidden
                style={{ pointerEvents: 'none', opacity: 0.55 }}
              >
                <div className="foleio-mkt-creator-banner" />
                <div className="foleio-mkt-creator-body">
                  <div className="foleio-mkt-creator-avatar-row">
                    <div className="foleio-mkt-creator-avatar" />
                  </div>
                  <div
                    style={{
                      height: 14,
                      width: '50%',
                      borderRadius: 6,
                      background: '#2b2b2b',
                    }}
                  />
                </div>
              </div>
            ))
          : displayList.map((creator) => {
              const href = creator.isSample
                ? '/creator/shosglam'
                : `/creator/${creator.username}`;
              const initial = (creator.displayName || creator.username || '?')
                .charAt(0)
                .toUpperCase();

              return (
                <Link
                  key={creator.id}
                  href={href}
                  className="foleio-mkt-creator-card"
                >
                  <div className="foleio-mkt-creator-banner">
                    {creator.bannerUrl ? (
                      <RemoteImage
                        src={creator.bannerUrl}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : null}
                    {creator.isSample ? (
                      <span className="foleio-mkt-creator-sample">Sample</span>
                    ) : null}
                  </div>
                  <div className="foleio-mkt-creator-body">
                    <div className="foleio-mkt-creator-avatar-row">
                      <div className="foleio-mkt-creator-avatar">
                        {creator.avatarUrl ? (
                          <RemoteImage
                            src={creator.avatarUrl}
                            alt=""
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                            }}
                          />
                        ) : (
                          <span>{initial}</span>
                        )}
                      </div>
                    </div>
                    <div className="foleio-mkt-creator-identity">
                      <h3 className="foleio-mkt-creator-name">
                        <span>{creator.displayName}</span>
                        <BadgeCheck strokeWidth={1.75} aria-label="Verified" />
                      </h3>
                      <p className="foleio-mkt-creator-handle">
                        @{creator.username}
                      </p>
                    </div>
                    {creator.category ? (
                      <span className="foleio-mkt-creator-cat">
                        {creator.category}
                      </span>
                    ) : null}
                    <p className="foleio-mkt-creator-bio">
                      {creator.bio || 'Book services or shop products on Foleio.'}
                    </p>
                    <span className="foleio-mkt-creator-cta">View profile</span>
                  </div>
                </Link>
              );
            })}
      </div>

      {!loading && !showSample && totalPages > 1 ? (
        <div className="foleio-mkt-discover-pager">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => void fetchCreators(currentPage - 1)}
          >
            Previous
          </button>
          <button type="button" data-active="true">
            {currentPage}
          </button>
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => void fetchCreators(currentPage + 1)}
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}
