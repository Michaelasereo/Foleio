const USERNAME = 'amatathelabel';

const creator = {
  id: '11180bad-7995-4d89-b0c2-8ca3997667f7',
  username: USERNAME,
  displayName: 'amatathelabel',
  bio: 'More than clothing- A symbol of beauty, strength and purpose\n\nMade to order',
  category: 'fashion',
  avatarUrl:
    'https://fnqnrdmzxgovaydlqyvl.supabase.co/storage/v1/object/public/crealio/avatars/9efc3ea2-0891-4e89-9e20-4b018bf525ad/1784744437119-oxcceyvkp5o.webp',
  bannerUrl:
    'https://fnqnrdmzxgovaydlqyvl.supabase.co/storage/v1/object/public/crealio/banners/9efc3ea2-0891-4e89-9e20-4b018bf525ad/1784747927517-38t763wryxb.webp',
  instagramHandle: null,
  tiktokHandle: null,
  subscriberCount: 0,
  contentCount: 0,
  introVideo: null,
  creatorLinks: [],
  priceListItems: [],
  availability: [],
  creatorPlans: [],
  platformPlan: 'starter',
  platformSubscriptionActive: true,
  paystackSubaccountCode: 'preview',
  subaccountStatus: 'ACTIVE',
  bvnVerified: false,
  fixedBookingsEnabled: true,
  customQuotesEnabled: false,
  shopEnabled: true,
};

const reviews = [
  {
    id: 'dfe195d0-b0d0-489c-9828-b79f8f4d817d',
    customerName: 'Ada Okafor',
    location: null,
    quote: 'Booking was smooth and the session exceeded my expectations. Highly recommend.',
  },
  {
    id: '632a36e6-8b1d-479a-859b-30c1dbd02e45',
    customerName: 'Chinedu Eze',
    location: null,
    quote: 'Ordered from the shop — packaging was lovely and delivery was on time.',
  },
];

type GallerySection = {
  id: string;
  name: string;
  description: string | null;
  items: Array<{
    id: string;
    imageUrl: string;
    caption: string | null;
    priceListItemId: string | null;
  }>;
};

type ShopProduct = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  compareAtPrice?: number | null;
  imageUrl: string | null;
  imageUrls?: string[];
  stock: number | null;
  showLimitedStock?: boolean;
  type?: string;
  variants: Array<{ id: string; name: string; options: string[] }>;
};

export type PublicLinkPreview = {
  creator: typeof creator;
  reviews: typeof reviews;
  gallery: GallerySection[];
  shop: {
    creatorId: string;
    merchantPhone: string | null;
    products: ShopProduct[];
    deliveryTiers: [];
  };
};

const gallery: GallerySection[] = [
  {
    id: '755c4e7b-825c-46a1-99d4-973b9dffa926',
    name: 'Gallery',
    description: null,
    items: [
      {
        id: '3f301ad0-eaa1-45d5-bf0f-dc92297e14b3',
        imageUrl:
          'https://pub-0e820f06444a4679b7a9b03be8fa9435.r2.dev/portfolio/11180bad-7995-4d89-b0c2-8ca3997667f7/1784748713910.jpg',
        caption: null,
        priceListItemId: null,
      },
      {
        id: 'a6541f96-3b95-4048-ac7d-736a7b802430',
        imageUrl:
          'https://pub-0e820f06444a4679b7a9b03be8fa9435.r2.dev/portfolio/11180bad-7995-4d89-b0c2-8ca3997667f7/1784748755948.jpg',
        caption: null,
        priceListItemId: null,
      },
      {
        id: '8c799c47-71f1-4898-86e5-dfc8045affc6',
        imageUrl:
          'https://pub-0e820f06444a4679b7a9b03be8fa9435.r2.dev/portfolio/11180bad-7995-4d89-b0c2-8ca3997667f7/1784748813823.jpg',
        caption: null,
        priceListItemId: null,
      },
    ],
  },
];

const products: ShopProduct[] = [
  {
    id: '9e91e820-f008-47e3-93f4-e0dd95644b7f',
    name: 'Bloom Kaftan (Burnt Orange)',
    description:
      'Crafted from soft crepe , the Bloom Kaftan features delicate organza detailing along the sleeves for an airy, graceful finish. Designed in a free-flowing silhouette, it’s one-size-fits-all is perfect for effortless elegance with meaning.\n\nPlease note: Production & Shipping time for this garment is 5-10 working days for nationwide orders.',
    price: 5050000,
    compareAtPrice: null,
    imageUrl:
      'https://pub-0e820f06444a4679b7a9b03be8fa9435.r2.dev/products/images/11180bad-7995-4d89-b0c2-8ca3997667f7-1784746166564.jpg',
    imageUrls: [
      'https://pub-0e820f06444a4679b7a9b03be8fa9435.r2.dev/products/images/11180bad-7995-4d89-b0c2-8ca3997667f7-1784746166564.jpg',
    ],
    stock: 1,
    showLimitedStock: true,
    type: 'physical',
    variants: [],
  },
  {
    id: '9469f771-d7ea-4878-9ce1-c8a263f83710',
    name: 'The Eden Set (Navy Blue)',
    description:
      'Designed for ease, movement, and quiet charm, the Eden Set is a two-piece ensemble featuring relaxed-fit shorts and a breezy long-sleeve top. Made from breathable, lightweight cotton, it’s detailed with striking Asooke embellishments on the sleeves, bringing a touch of tradition to your everyday wear.\n\nPlease note: Production & Shipping time for this garment is 5-10 working days for nationwide orders.',
    price: 3500000,
    compareAtPrice: null,
    imageUrl:
      'https://pub-0e820f06444a4679b7a9b03be8fa9435.r2.dev/products/images/11180bad-7995-4d89-b0c2-8ca3997667f7-1784750215889.jpg',
    imageUrls: [
      'https://pub-0e820f06444a4679b7a9b03be8fa9435.r2.dev/products/images/11180bad-7995-4d89-b0c2-8ca3997667f7-1784750215889.jpg',
    ],
    stock: 5,
    showLimitedStock: true,
    type: 'physical',
    variants: [],
  },
  {
    id: 'b7f34bc3-8524-4778-abdd-e3f7b360e914',
    name: 'Bloom Kaftan (Green)',
    description:
      'Crafted from soft crepe , the Bloom Kaftan features delicate organza detailing along the sleeves for an airy, graceful finish. Designed in a free-flowing silhouette, it’s one-size-fits-all is perfect for effortless elegance with meaning.\n\nPlease note: Production & Shipping time for this garment is 5-10 working days for nationwide orders.',
    price: 5050000,
    compareAtPrice: null,
    imageUrl:
      'https://pub-0e820f06444a4679b7a9b03be8fa9435.r2.dev/products/images/11180bad-7995-4d89-b0c2-8ca3997667f7-1785706950880.jpg',
    imageUrls: [
      'https://pub-0e820f06444a4679b7a9b03be8fa9435.r2.dev/products/images/11180bad-7995-4d89-b0c2-8ca3997667f7-1785706950880.jpg',
    ],
    stock: 2,
    showLimitedStock: true,
    type: 'physical',
    variants: [],
  },
];

export const publicLinkPreview: PublicLinkPreview = {
  creator,
  reviews,
  gallery,
  shop: {
    creatorId: creator.id,
    merchantPhone: null,
    products,
    deliveryTiers: [],
  },
};
