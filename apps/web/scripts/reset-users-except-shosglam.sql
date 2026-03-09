BEGIN;

-- Safety check: abort if keeper account is missing.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM users
    WHERE LOWER(email) = LOWER('shosglam@gmail.com')
  ) THEN
    RAISE EXCEPTION 'Keeper account shosglam@gmail.com not found in public.users. Aborting reset.';
  END IF;
END $$;

-- Resolve keeper IDs once and reuse.
WITH keeper AS (
  SELECT id AS user_id
  FROM users
  WHERE LOWER(email) = LOWER('shosglam@gmail.com')
  LIMIT 1
),
keeper_creator AS (
  SELECT id AS creator_id
  FROM creators
  WHERE user_id = (SELECT user_id FROM keeper)
  LIMIT 1
)
-- Remove non-keeper transactions first because FKs do not cascade here.
DELETE FROM transactions
WHERE
  (user_id IS NOT NULL AND user_id <> (SELECT user_id FROM keeper))
  OR (
    creator_id IS NOT NULL
    AND creator_id <> COALESCE((SELECT creator_id FROM keeper_creator), creator_id)
  );

-- Remove fan subscriptions not tied to the keeper fan+creator pair.
WITH keeper AS (
  SELECT id AS user_id
  FROM users
  WHERE LOWER(email) = LOWER('shosglam@gmail.com')
  LIMIT 1
),
keeper_creator AS (
  SELECT id AS creator_id
  FROM creators
  WHERE user_id = (SELECT user_id FROM keeper)
  LIMIT 1
)
DELETE FROM fan_subscriptions
WHERE
  fan_id <> (SELECT user_id FROM keeper)
  OR creator_id <> COALESCE((SELECT creator_id FROM keeper_creator), creator_id);

-- Optional cleanup for OTP/login codes so everyone starts fresh.
DELETE FROM fan_otp_codes;

-- Delete all creators except keeper creator.
WITH keeper AS (
  SELECT id AS user_id
  FROM users
  WHERE LOWER(email) = LOWER('shosglam@gmail.com')
  LIMIT 1
)
DELETE FROM creators
WHERE user_id <> (SELECT user_id FROM keeper);

-- Delete all app users except keeper.
DELETE FROM users
WHERE LOWER(email) <> LOWER('shosglam@gmail.com');

-- Delete all auth users except keeper (Supabase auth table).
DELETE FROM auth.users
WHERE LOWER(email) <> LOWER('shosglam@gmail.com');

COMMIT;
