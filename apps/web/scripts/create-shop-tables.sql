CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  creator_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL,
  compare_at_price INTEGER,
  weight FLOAT,
  type TEXT DEFAULT 'physical',
  image_url TEXT,
  digital_file_url TEXT,
  stock INTEGER,
  status TEXT DEFAULT 'draft',
  order_index INTEGER NOT NULL DEFAULT 0,
  waive_delivery_fee BOOLEAN NOT NULL DEFAULT false,
  is_preorder BOOLEAN NOT NULL DEFAULT false,
  preorder_settings JSONB,
  addons JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_variants (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  options TEXT[] DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS delivery_tiers (
  id TEXT PRIMARY KEY,
  creator_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'paid',
  flat_rate INTEGER NOT NULL,
  estimated_days TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  fan_id TEXT NOT NULL,
  creator_id TEXT NOT NULL,
  delivery_tier_id TEXT REFERENCES delivery_tiers(id),
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
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id),
  variant_selected JSONB,
  addons_selected JSONB,
  quantity INTEGER DEFAULT 1,
  unit_price INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
