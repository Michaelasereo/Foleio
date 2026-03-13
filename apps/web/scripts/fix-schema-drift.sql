-- PRICE LIST / SERVICES
ALTER TABLE price_list_items
ADD COLUMN IF NOT EXISTS service_type
  TEXT DEFAULT 'general';

ALTER TABLE price_list_items
ADD COLUMN IF NOT EXISTS duration_minutes
  INTEGER;

ALTER TABLE price_list_items
ADD COLUMN IF NOT EXISTS calendly_link
  TEXT;

ALTER TABLE price_list_items
ADD COLUMN IF NOT EXISTS session_description
  TEXT;

-- CONTENT
ALTER TABLE content
ADD COLUMN IF NOT EXISTS published_at
  TIMESTAMP;

-- CREATORS
ALTER TABLE creators
ADD COLUMN IF NOT EXISTS has_completed_onboarding
  BOOLEAN DEFAULT false;

ALTER TABLE creators
ADD COLUMN IF NOT EXISTS has_completed_tour
  BOOLEAN DEFAULT false;

ALTER TABLE creators
ADD COLUMN IF NOT EXISTS has_seen_welcome
  BOOLEAN DEFAULT false;

ALTER TABLE creators
ADD COLUMN IF NOT EXISTS links
  JSONB DEFAULT '[]';

ALTER TABLE creators
ADD COLUMN IF NOT EXISTS journal_bio
  TEXT;

ALTER TABLE creators
ADD COLUMN IF NOT EXISTS ecwid_store_id
  TEXT;

ALTER TABLE creators
ADD COLUMN IF NOT EXISTS industry
  TEXT;

ALTER TABLE creators
ADD COLUMN IF NOT EXISTS subscription_enabled
  BOOLEAN DEFAULT false;

ALTER TABLE creators
ADD COLUMN IF NOT EXISTS monthly_price
  INTEGER;

ALTER TABLE creators
ADD COLUMN IF NOT EXISTS subscription_perks
  TEXT;

-- SHOP TABLES
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  creator_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL,
  weight FLOAT,
  type TEXT DEFAULT 'physical',
  image_url TEXT,
  digital_file_url TEXT,
  stock INTEGER,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_variants (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL
    REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  options TEXT[] DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS delivery_tiers (
  id TEXT PRIMARY KEY,
  creator_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  flat_rate INTEGER NOT NULL,
  estimated_days TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  fan_id TEXT NOT NULL,
  creator_id TEXT NOT NULL,
  delivery_tier_id TEXT
    REFERENCES delivery_tiers(id),
  delivery_address JSONB NOT NULL DEFAULT '{}',
  subtotal INTEGER NOT NULL DEFAULT 0,
  delivery_fee INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'pending',
  paystack_reference TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL
    REFERENCES orders(id),
  product_id TEXT NOT NULL,
  variant_selected JSONB,
  quantity INTEGER DEFAULT 1,
  unit_price INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- VERIFY everything added
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name IN (
  'creators',
  'price_list_items',
  'content',
  'products',
  'orders'
)
ORDER BY table_name, column_name;
