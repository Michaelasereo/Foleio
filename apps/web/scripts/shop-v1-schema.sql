-- Shop v1 schema extensions (physical products, delivery types, addons, etc.)
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS compare_at_price INTEGER,
  ADD COLUMN IF NOT EXISTS order_index INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS waive_delivery_fee BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_preorder BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS preorder_settings JSONB,
  ADD COLUMN IF NOT EXISTS addons JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS image_urls TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS products_creator_id_order_index_idx ON products (creator_id, order_index);

ALTER TABLE delivery_tiers
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'paid';

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS addons_selected JSONB;
