BEGIN;

-- Enable UUID/random helpers when available.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- creators: moderation + journal profile fields
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS creators
  ADD COLUMN IF NOT EXISTS content_guidelines_accepted BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS content_guidelines_accepted_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS has_seen_welcome BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS ban_reason TEXT NULL,
  ADD COLUMN IF NOT EXISTS journal_bio TEXT NULL;

-- ---------------------------------------------------------------------------
-- content/contents: moderation + standalone/section fields
-- (project table is "content", but we guard "contents" too for compatibility)
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS content
  ADD COLUMN IF NOT EXISTS flagged_for_review BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS flagged_reason TEXT NULL,
  ADD COLUMN IF NOT EXISTS flagged_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS moderation_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS is_standalone BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS section_id TEXT NULL,
  ADD COLUMN IF NOT EXISTS section_order INTEGER NOT NULL DEFAULT 0;

ALTER TABLE IF EXISTS contents
  ADD COLUMN IF NOT EXISTS flagged_for_review BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS flagged_reason TEXT NULL,
  ADD COLUMN IF NOT EXISTS flagged_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS moderation_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS is_standalone BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS section_id TEXT NULL,
  ADD COLUMN IF NOT EXISTS section_order INTEGER NOT NULL DEFAULT 0;

-- ---------------------------------------------------------------------------
-- New tables: JournalEntry, CollectionSection, ContentReport
-- Prisma mappings:
-- - JournalEntry -> journal_entries
-- - CollectionSection -> sections
-- - ContentReport -> content_reports
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS journal_entries (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  creator_id TEXT NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT NULL,
  slug TEXT NOT NULL,
  content TEXT NOT NULL,
  cover_image TEXT NULL,
  tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  read_time INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft',
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ NULL,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sections (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  collection_id TEXT NOT NULL,
  parent_section_id TEXT NULL,
  title TEXT NOT NULL,
  description TEXT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS content_reports (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  content_id TEXT NULL,
  reporter_email TEXT NULL,
  reason TEXT NOT NULL,
  details TEXT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ NULL,
  reviewed_by TEXT NULL
);

-- Optional junction table used by sectioned collections.
CREATE TABLE IF NOT EXISTS section_contents (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  section_id TEXT NOT NULL,
  content_id TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Constraints (idempotent)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.creators') IS NOT NULL AND to_regclass('public.journal_entries') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'journal_entries_creator_id_fkey'
    ) THEN
      ALTER TABLE journal_entries
      ADD CONSTRAINT journal_entries_creator_id_fkey
      FOREIGN KEY (creator_id) REFERENCES creators(id) ON DELETE CASCADE;
    END IF;
  END IF;

  IF to_regclass('public.collections') IS NOT NULL AND to_regclass('public.sections') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'sections_collection_id_fkey'
    ) THEN
      ALTER TABLE sections
      ADD CONSTRAINT sections_collection_id_fkey
      FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE;
    END IF;
  END IF;

  IF to_regclass('public.sections') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'sections_parent_section_id_fkey'
    ) THEN
      ALTER TABLE sections
      ADD CONSTRAINT sections_parent_section_id_fkey
      FOREIGN KEY (parent_section_id) REFERENCES sections(id) ON DELETE CASCADE;
    END IF;
  END IF;

  IF to_regclass('public.content') IS NOT NULL AND to_regclass('public.content_reports') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'content_reports_content_id_fkey'
    ) THEN
      ALTER TABLE content_reports
      ADD CONSTRAINT content_reports_content_id_fkey
      FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE;
    END IF;
  END IF;

  IF to_regclass('public.sections') IS NOT NULL AND to_regclass('public.content') IS NOT NULL AND to_regclass('public.section_contents') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'section_contents_section_id_fkey'
    ) THEN
      ALTER TABLE section_contents
      ADD CONSTRAINT section_contents_section_id_fkey
      FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'section_contents_content_id_fkey'
    ) THEN
      ALTER TABLE section_contents
      ADD CONSTRAINT section_contents_content_id_fkey
      FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Uniques and indexes (idempotent)
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS journal_entries_creator_id_slug_key
  ON journal_entries(creator_id, slug);
CREATE INDEX IF NOT EXISTS journal_entries_creator_id_idx
  ON journal_entries(creator_id);
CREATE INDEX IF NOT EXISTS journal_entries_is_published_idx
  ON journal_entries(is_published);
CREATE INDEX IF NOT EXISTS journal_entries_published_at_idx
  ON journal_entries(published_at);

CREATE INDEX IF NOT EXISTS sections_collection_id_idx
  ON sections(collection_id);
CREATE INDEX IF NOT EXISTS sections_parent_section_id_idx
  ON sections(parent_section_id);

CREATE INDEX IF NOT EXISTS content_reports_content_id_idx
  ON content_reports(content_id);
CREATE INDEX IF NOT EXISTS content_reports_status_idx
  ON content_reports(status);
CREATE INDEX IF NOT EXISTS content_reports_reason_idx
  ON content_reports(reason);

CREATE UNIQUE INDEX IF NOT EXISTS section_contents_section_id_content_id_key
  ON section_contents(section_id, content_id);
CREATE INDEX IF NOT EXISTS section_contents_section_id_idx
  ON section_contents(section_id);
CREATE INDEX IF NOT EXISTS section_contents_content_id_idx
  ON section_contents(content_id);

CREATE INDEX IF NOT EXISTS content_flagged_for_review_idx
  ON content(flagged_for_review);
CREATE INDEX IF NOT EXISTS content_moderation_status_idx
  ON content(moderation_status);
CREATE INDEX IF NOT EXISTS content_section_id_idx
  ON content(section_id);

COMMIT;
