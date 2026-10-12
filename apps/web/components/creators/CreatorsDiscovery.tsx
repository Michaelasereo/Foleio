'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BadgeCheck, Forward } from 'lucide-react';
import { RemoteImage } from '@/components/creator/RemoteImage';
import { Reveal } from '@/components/landing/Reveal';

type CreatorCard = {
  id: string;
  username: string;
  displayName: string;
  bio: string | null;
  category: string | null;
  avatarUrl: string | null;
  location: string | null;
  coverImages: string[];
  offer: string;
  pro?: boolean;
  verified?: boolean;
};

type Facets = {
  listedTotal: number;
  total: number;
  categories: { value: string; label: string; count: number }[];
  cities: string[];
};

const EMPTY_FACETS: Facets = {
  listedTotal: 0,
  total: 0,
  categories: [],
  cities: [],
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function specialtyLine(bio: string | null, location: string | null) {
  const text = (bio || '').replace(/\s+/g, ' ').trim();
  const first = text.split(/[.|\n]/)[0]?.trim() || '';
  const clipped = first.length > 72 ? `${first.slice(0, 69).trim()}…` : first;
  if (clipped && location && !clipped.toLowerCase().includes(location.toLowerCase())) {
    return `${clipped} · ${location}`;
  }
  return clipped || location || '';
}

function cityLine(cities: string[]) {
  if (cities.length === 0) return '';
  if (cities.length === 1) return cities[0];
  if (cities.length === 2) return `${cities[0]} and ${cities[1]}`;
  const extra = cities.length - 2;
  return `${cities[0]}, ${cities[1]}, and ${extra} more ${extra === 1 ? 'city' : 'cities'}`;
}

function titleCase(value: string) {
  return value.replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const SAMPLE_CREATORS: CreatorCard[] = [
  {
    id: 'sample-adaeze',
    username: 'adaeze',
    displayName: 'Adaeze Okoro',
    bio: 'Bridal makeup artist',
    category: 'makeup',
    avatarUrl: null,
    location: 'Lekki, Lagos',
    coverImages: [],
    offer: 'Bookings from ₦15,000 · Shop',
    pro: true,
    verified: true,
  },
  {
    id: 'sample-tobi',
    username: 'tobiadeyemi',
    displayName: 'Tobi Adeyemi',
    bio: 'Wedding and portrait photographer',
    category: 'photography',
    avatarUrl: null,
    location: 'Yaba, Lagos',
    coverImages: [],
    offer: 'Bookings from ₦60,000',
    pro: true,
    verified: true,
  },
  {
    id: 'sample-halima',
    username: 'halimasule',
    displayName: 'Halima Sule',
    bio: 'Braids and natural hair',
    category: 'hair',
    avatarUrl: null,
    location: 'Wuse, Abuja',
    coverImages: [],
    offer: 'Shop from ₦12,000 · Shop',
    pro: true,
    verified: true,
  },
  {
    id: 'sample-chidera',
    username: 'chidera',
    displayName: 'Chidera Nwosu',
    bio: 'Bespoke womenswear',
    category: 'fashion',
    avatarUrl: null,
    location: 'Enugu',
    coverImages: [],
    offer: 'Shop from ₦18,000 · Fittings',
    pro: true,
    verified: true,
  },
  {
    id: 'sample-kunle',
    username: 'kunlebello',
    displayName: 'Kunle Bello',
    bio: 'Personal trainer',
    category: 'fitness',
    avatarUrl: null,
    location: 'Ikeja, Lagos',
    coverImages: [],
    offer: 'Bookings from ₦8,000',
    pro: true,
    verified: true,
  },
  {
    id: 'sample-zainab',
    username: 'zainabgarba',
    displayName: 'Zainab Garba',
    bio: 'Soft glam and gele',
    category: 'makeup',
    avatarUrl: null,
    location: 'Kano',
    coverImages: [],
    offer: 'Bookings from ₦20,000 · Shop',
    pro: true,
    verified: true,
  },
  {
    id: 'sample-ifeoma',
    username: 'ifeomaeze',
    displayName: 'Ifeoma Eze',
    bio: 'Wigs and installs',
    category: 'hair',
    avatarUrl: null,
    location: 'Port Harcourt',
    coverImages: [],
    offer: 'Shop from ₦45,000 · Shop',
    pro: true,
    verified: true,
  },
  {
    id: 'sample-seun',
    username: 'seunakande',
    displayName: 'Seun Akande',
    bio: 'Product and brand photographer',
    category: 'photography',
    avatarUrl: null,
    location: 'Ibadan',
    coverImages: [],
    offer: 'Bookings from ₦45,000',
    pro: true,
    verified: true,
  },
  {
    id: 'sample-amaka',
    username: 'amakaobi',
    displayName: 'Amaka Obi',
    bio: 'Editorial makeup',
    category: 'makeup',
    avatarUrl: null,
    location: 'Victoria Island, Lagos',
    coverImages: [],
    offer: 'Bookings from ₦35,000 · Shop',
    pro: true,
    verified: true,
  },
];

function sampleMatches(creator: CreatorCard, query: string) {
  if (!query) return true;
  const haystack = [creator.displayName, creator.username, creator.bio, creator.category, creator.location, creator.offer]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(query.toLowerCase());
}

function citiesFromCreators(list: CreatorCard[]) {
  const cities: string[] = [];
  for (const creator of list) {
    const city = (creator.location || '')
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
      .pop();
    if (city && !cities.some((existing) => existing.toLowerCase() === city.toLowerCase())) {
      cities.push(city);
    }
  }
  return cities;
}

function facetsFromCreators(list: CreatorCard[]): Facets {
  const counts = new Map<string, number>();
  for (const creator of list) {
    const key = creator.category || 'other';
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const order = ['makeup', 'hair', 'photography', 'fashion', 'fitness'];
  const categories = [
    ...order.filter((value) => counts.has(value)),
    ...[...counts.keys()].filter((value) => !order.includes(value)),
  ].map((value) => ({
    value,
    label: titleCase(value),
    count: counts.get(value) || 0,
  }));
  return {
    listedTotal: list.length,
    total: list.length,
    categories,
    cities: citiesFromCreators(list),
  };
}

export function CreatorsDiscovery() {
  const [creators, setCreators] = useState<CreatorCard[]>([]);
  const [facets, setFacets] = useState<Facets>(EMPTY_FACETS);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchQuery.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setFailed(false);
      try {
        const params = new URLSearchParams({
          page: '1',
          limit: '12',
          category: selectedCategory,
          ...(debouncedSearch ? { search: debouncedSearch } : {}),
        });
        const response = await fetch(`/api/creators?${params}`, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || 'Failed to fetch creators');
        const list = Array.isArray(data.creators) ? data.creators : [];
        setCreators(list);
        setFacets({
          listedTotal: Number(data.facets?.listedTotal) || 0,
          total: Number(data.facets?.total) || 0,
          categories: Array.isArray(data.facets?.categories) ? data.facets.categories : [],
          cities: Array.isArray(data.facets?.cities) ? data.facets.cities : [],
        });
        setTotalPages(Number(data.pagination?.pages) || 1);
        setCurrentPage(Number(data.pagination?.page) || 1);
        setTotalCount(Number(data.pagination?.total) || list.length);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        console.error('Failed to fetch creators:', error);
        setFailed(true);
        setCreators([]);
        setTotalCount(0);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [debouncedSearch, selectedCategory]);

  async function goToPage(page: number) {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '12',
        category: selectedCategory,
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
      });
      const response = await fetch(`/api/creators?${params}`);
      const data = await response.json();
      const list = Array.isArray(data.creators) ? data.creators : [];
      setCreators(list);
      setFacets((current) => ({
        ...current,
        cities: Array.isArray(data.facets?.cities) ? data.facets.cities : current.cities,
      }));
      setTotalPages(Number(data.pagination?.pages) || 1);
      setCurrentPage(Number(data.pagination?.page) || page);
      setTotalCount(Number(data.pagination?.total) || list.length);
    } catch (error) {
      console.error('Failed to fetch creators:', error);
    } finally {
      setLoading(false);
    }
  }

  const showSamples = !loading && creators.length === 0 && (failed || facets.listedTotal === 0);
  const searchedSamples = SAMPLE_CREATORS.filter((creator) => sampleMatches(creator, debouncedSearch));
  const visibleCreators = showSamples
    ? searchedSamples.filter((creator) => selectedCategory === 'all' || creator.category === selectedCategory)
    : creators;
  const visibleFacets = showSamples ? facetsFromCreators(searchedSamples) : facets;
  const visibleCount = showSamples ? visibleCreators.length : totalCount;
  const cities = cityLine(showSamples ? citiesFromCreators(visibleCreators) : facets.cities);
  const host = typeof window === 'undefined' ? 'foleio.com' : window.location.host;

  return (
    <div className="mt-9">
      <Reveal className="flex flex-wrap items-center gap-2.5" delay={80}>
        <label className="relative min-w-[240px] flex-1 sm:max-w-[280px] sm:flex-none">
          <span className="sr-only">Search creators</span>
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by name, craft, or city"
            className="h-10 w-full rounded-full border border-[#e4e1da] bg-white px-4 text-[14px] text-[#1c1b19] outline-none placeholder:text-[#8a877f] focus:border-[#1c1b19]"
          />
        </label>
        <div className="flex gap-2 overflow-x-auto" role="tablist" aria-label="Categories">
          <CategoryPill
            active={selectedCategory === 'all'}
            label="All"
            count={visibleFacets.total}
            onClick={() => setSelectedCategory('all')}
          />
          {visibleFacets.categories.map((category) => (
            <CategoryPill
              key={category.value}
              active={selectedCategory === category.value}
              label={category.label}
              count={category.count}
              onClick={() => setSelectedCategory(category.value)}
            />
          ))}
        </div>
      </Reveal>

      <Reveal className="mt-5 flex flex-wrap items-center justify-between gap-2 text-[14px] text-[#6b6a64]" delay={140}>
        <p>
          {loading
            ? 'Loading creators…'
            : `${visibleCount} creator${visibleCount === 1 ? '' : 's'}`}
        </p>
        {cities ? <p>{cities}</p> : null}
      </Reveal>

      {loading ? (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-[280px] animate-pulse rounded-[22px] border border-[#e7e5e0] bg-white" />
          ))}
        </div>
      ) : !showSamples && failed ? (
        <p className="mt-10 text-center text-[16px] text-[#6b6a64]">
          Creators could not be loaded. Refresh the page and try again.
        </p>
      ) : visibleCreators.length === 0 ? (
        <p className="mt-10 text-center text-[16px] text-[#6b6a64]">
          No creators match that search.
        </p>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleCreators.map((creator, index) => {
            const detail = specialtyLine(creator.bio, creator.location);
            const categoryLabel = creator.category ? titleCase(creator.category) : '';
            return (
              <Reveal key={creator.id} className="h-full" delay={Math.min(index, 8) * 70}>
              <Link
                href={`/creator/${creator.username}`}
                className="group flex h-full flex-col overflow-hidden rounded-[22px] border border-[#e6e3dc] bg-white transition duration-200 hover:-translate-y-0.5 hover:border-[#d9d6cf] hover:shadow-[0_16px_40px_-24px_rgba(28,27,25,0.45)]"
              >
                <div className="relative z-0 h-[132px] bg-[#eceae4]">
                  <Cover images={creator.coverImages} />
                  {categoryLabel ? (
                    <span className="absolute bottom-3 right-3 rounded-full bg-white px-2.5 py-1 text-[12px] font-medium text-[#3b3a36] shadow-[0_1px_2px_rgba(28,27,25,0.08)]">
                      {categoryLabel}
                    </span>
                  ) : null}
                </div>
                <div className="relative z-10 flex flex-1 flex-col px-4 pb-4">
                  <div className="relative z-10 -mt-5 h-11 w-11 overflow-hidden rounded-full border-[3px] border-white bg-[#1c1b19] text-[13px] font-semibold text-white">
                    {creator.avatarUrl ? (
                      <RemoteImage
                        src={creator.avatarUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center">
                        {initials(creator.displayName || creator.username)}
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex items-center gap-1.5">
                    <h3 className="min-w-0 truncate text-[18px] font-semibold tracking-[-0.02em] text-[#1c1b19]">
                      {creator.displayName}
                    </h3>
                    {creator.verified ? (
                      <BadgeCheck
                        aria-label="Verified"
                        className="h-[18px] w-[18px] shrink-0 fill-[#1c6ef2] text-white"
                        strokeWidth={2.25}
                      />
                    ) : null}
                    {creator.pro ? (
                      <span className="inline-flex h-[18px] shrink-0 items-center rounded-full bg-[#F97316] px-1.5 text-[10px] font-semibold uppercase leading-none tracking-[0.04em] text-white">
                        Pro
                      </span>
                    ) : null}
                  </div>
                  {detail ? <p className="mt-1 text-[14px] leading-snug text-[#6b6a64]">{detail}</p> : null}
                  {creator.offer ? (
                    <p className="mt-2 text-[14px] text-[#1c1b19]">{creator.offer}</p>
                  ) : null}
                  <div className="mt-auto pt-4">
                    <div className="flex items-center justify-between gap-3 rounded-[14px] bg-[#f3f1ec] py-1.5 pl-3.5 pr-1.5 text-[13px]">
                      <span className="min-w-0 truncate text-[#6b6a64]">
                        {host}/creator/{creator.username}
                      </span>
                      <span
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-white text-[#1c1b19]"
                        aria-label="View page"
                      >
                        <Forward aria-hidden="true" size={18} strokeWidth={2.25} />
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
              </Reveal>
            );
          })}
        </div>
      )}

      {!showSamples && !loading && creators.length > 0 && totalPages > 1 ? (
        <div className="mt-8 flex items-center justify-center gap-2">
          <button
            type="button"
            className="h-9 rounded-full border border-[#e4e1da] bg-white px-4 text-[14px] disabled:opacity-40"
            disabled={currentPage <= 1}
            onClick={() => void goToPage(currentPage - 1)}
          >
            Previous
          </button>
          <span className="px-2 text-[14px] text-[#6b6a64]">
            {currentPage} of {totalPages}
          </span>
          <button
            type="button"
            className="h-9 rounded-full border border-[#e4e1da] bg-white px-4 text-[14px] disabled:opacity-40"
            disabled={currentPage >= totalPages}
            onClick={() => void goToPage(currentPage + 1)}
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}

function CategoryPill({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[14px] ${
        active
          ? 'bg-[#1c1b19] text-white'
          : 'border border-[#e4e1da] bg-white text-[#1c1b19]'
      }`}
    >
      <span>{label}</span>
      <span className={active ? 'text-white/70' : 'text-[#8a877f]'}>{count}</span>
    </button>
  );
}

function Cover({ images }: { images: string[] }) {
  if (images.length === 0) {
    return (
      <div className="grid h-full grid-cols-3">
        <span className="bg-[#e7e4dd]" />
        <span className="bg-[#d9d6cf]" />
        <span className="bg-[#eeebe4]" />
      </div>
    );
  }

  if (images.length === 1) {
    return (
      <RemoteImage src={images[0]} alt="" className="h-full w-full object-cover" />
    );
  }

  return (
    <div className="grid h-full grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => {
        const src = images[index] || images[images.length - 1];
        return <RemoteImage key={`${src}-${index}`} src={src} alt="" className="h-full w-full object-cover" />;
      })}
    </div>
  );
}
