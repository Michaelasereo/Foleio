'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Search,
  Users,
  Play,
  Instagram,
  Music,
  Heart,
  Crown
} from 'lucide-react';
import { DefaultThumbnail } from '@/components/ui/DefaultThumbnail';
import { getThumbnailUrl } from '@/lib/utils/generate-thumbnail';

interface Creator {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  category: string;
  avatarUrl: string;
  bannerUrl: string;
  instagramHandle?: string;
  tiktokHandle?: string;
  subscriberCount: number;
  contentCount: number;
  createdAt: string;
  pricing: {
    planName: string;
    price: number;
    features: string[];
  } | null;
  recentContent: Array<{
    id: string;
    title: string;
    thumbnailUrl: string;
    type: string;
    viewCount: number;
  }>;
}

const categories = [
  { value: 'all', label: 'All Categories', icon: Crown },
  { value: 'makeup', label: 'Makeup', icon: Users },
  { value: 'hair', label: 'Hair', icon: Users },
  { value: 'fashion', label: 'Fashion', icon: Users },
  { value: 'fitness', label: 'Fitness', icon: Users },
  { value: 'cooking', label: 'Cooking', icon: Users },
  { value: 'music', label: 'Music', icon: Music },
  { value: 'art', label: 'Art', icon: Users },
  { value: 'photography', label: 'Photography', icon: Users },
];

export function CreatorsDiscovery() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchCreators = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        category: selectedCategory,
        ...(searchQuery && { search: searchQuery })
      });

      const response = await fetch(`/api/creators?${params}`);
      const data = await response.json();

      setCreators(data.creators);
      setTotalPages(data.pagination.pages);
      setCurrentPage(data.pagination.page);
    } catch (error) {
      console.error('Failed to fetch creators:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCreators();
  }, [selectedCategory, searchQuery]);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    fetchCreators(1);
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchCreators(page);
  };

  const getCategoryIcon = (category: string) => {
    const cat = categories.find(c => c.value === category);
    return cat ? cat.icon : Users;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(price / 100); // Convert from kobo to naira
  };

  return (
    <div className="space-y-8">
      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <form onSubmit={handleSearch} className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Search creators..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button type="submit">Search</Button>
        </form>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <Button
                key={category.value}
                variant={selectedCategory === category.value ? "default" : "outline"}
                size="sm"
                onClick={() => handleCategoryChange(category.value)}
                className="flex items-center gap-2"
              >
                <Icon className="w-4 h-4" />
                {category.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Results Count */}
      <div className="flex justify-between items-center">
        <p className="text-gray-600">
          {loading ? 'Loading creators...' : `Found ${creators.length} creators`}
        </p>
        {!loading && creators.length === 0 && (
          <p className="text-gray-500">No Pro creators yet. Check back soon.</p>
        )}
      </div>

      {/* Creators Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {creators.map((creator) => (
          <Card key={creator.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            {/* Banner */}
            <div className="relative h-32 bg-gradient-to-r from-purple-400 to-pink-400">
              {creator.bannerUrl && (
                <img
                  src={creator.bannerUrl}
                  alt={`${creator.displayName} banner`}
                  className="w-full h-full object-cover"
                />
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                <div className="flex items-center space-x-3">
                  <Avatar className="w-12 h-12 border-2 border-white">
                    <AvatarImage src={creator.avatarUrl} alt={creator.displayName} />
                    <AvatarFallback>
                      {creator.displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-white text-sm">
                      {creator.displayName}
                    </h3>
                    <p className="text-white/80 text-xs">@{creator.username}</p>
                  </div>
                </div>
              </div>
            </div>

            <CardContent className="p-4">
              {/* Category and Social */}
              <div className="flex items-center justify-between mb-3">
                <Badge variant="secondary" className="flex items-center gap-1">
                  {(() => {
                    const CategoryIcon = getCategoryIcon(creator.category);
                    return <CategoryIcon className="w-3 h-3" />;
                  })()}
                  {creator.category}
                </Badge>
                <div className="flex space-x-2">
                  {creator.instagramHandle && (
                    <a
                      href={`https://instagram.com/${creator.instagramHandle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-pink-500 hover:text-pink-600"
                    >
                      <Instagram className="w-4 h-4" />
                    </a>
                  )}
                  {creator.tiktokHandle && (
                    <a
                      href={`https://tiktok.com/@${creator.tiktokHandle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-black hover:text-gray-600"
                    >
                      <Music className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>

              {/* Bio */}
              <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                {creator.bio || 'No bio available'}
              </p>

              {/* Stats */}
              <div className="flex justify-between text-sm text-gray-500 mb-3">
                <span>{creator.subscriberCount.toLocaleString()} subscribers</span>
                <span>{creator.contentCount} videos</span>
              </div>

              {/* Pricing */}
              {creator.pricing && (
                <div className="bg-gray-50 rounded-lg p-3 mb-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-sm">{creator.pricing.planName}</span>
                    <span className="font-bold text-green-600">
                      {formatPrice(creator.pricing.price)}/month
                    </span>
                  </div>
                  <ul className="text-xs text-gray-600 space-y-1">
                    {creator.pricing.features.slice(0, 2).map((feature, index) => (
                      <li key={index}>• {feature}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recent Content Preview */}
              {creator.recentContent.length > 0 && (
                <div className="mb-3">
                  <p className="text-sm font-medium text-gray-700 mb-2">Recent Content</p>
                  <div className="grid grid-cols-3 gap-2">
                    {creator.recentContent.slice(0, 3).map((content) => (
                      <div key={content.id} className="relative aspect-square bg-gray-100 rounded overflow-hidden">
                        {getThumbnailUrl(content) ? (
                          <img
                            src={getThumbnailUrl(content) || ''}
                            alt={content.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <DefaultThumbnail title={content.title} aspectRatio="1/1" size="sm" />
                        )}
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                          <Play className="w-8 h-8 text-white" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => window.open(`/${creator.username}`, '_blank')}
                >
                  View Profile
                </Button>
                {creator.pricing && (
                  <Button size="sm" className="flex-1">
                    <Heart className="w-4 h-4 mr-1" />
                    Subscribe
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <div className="h-32 bg-gray-200 animate-pulse"></div>
              <CardContent className="p-4">
                <div className="animate-pulse space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-24"></div>
                      <div className="h-3 bg-gray-200 rounded w-16"></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  </div>
                  <div className="flex justify-between">
                    <div className="h-3 bg-gray-200 rounded w-16"></div>
                    <div className="h-3 bg-gray-200 rounded w-12"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex justify-center space-x-2 mt-8">
          <Button
            variant="outline"
            disabled={currentPage === 1}
            onClick={() => handlePageChange(currentPage - 1)}
          >
            Previous
          </Button>

          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const page = i + 1;
            return (
              <Button
                key={page}
                variant={currentPage === page ? "default" : "outline"}
                onClick={() => handlePageChange(page)}
              >
                {page}
              </Button>
            );
          })}

          <Button
            variant="outline"
            disabled={currentPage === totalPages}
            onClick={() => handlePageChange(currentPage + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
