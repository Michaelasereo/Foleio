BEGIN;

-- Remove all app/auth data for a targeted email list so those users can sign up fresh.
WITH target_emails AS (
  SELECT LOWER(email) AS email
  FROM (VALUES
    ('noraonyeka3@gmail.com'),
    ('tadenmosun@gmail.com'),
    ('tosinakingbade7@gmail.com'),
    ('michaelasereo@gmail.com'),
    ('chiamakasoniaeke@gmail.com'),
    ('ajayiodeborah@gmail.com'),
    ('awonaiketimmie@gmail.com'),
    ('arisoyinopemipograce@gmail.com'),
    ('clealthstudios@gmail.com'),
    ('asereope@gmail.com'),
    ('michaelasereoo@gmail.com')
  ) AS t(email)
),
target_users AS (
  SELECT id, LOWER(email) AS email
  FROM users
  WHERE LOWER(email) IN (SELECT email FROM target_emails)
),
target_creators AS (
  SELECT id
  FROM creators
  WHERE user_id IN (SELECT id FROM target_users)
)
DELETE FROM transactions
WHERE
  (user_id IS NOT NULL AND user_id IN (SELECT id FROM target_users))
  OR (creator_id IS NOT NULL AND creator_id IN (SELECT id FROM target_creators));

DELETE FROM users
WHERE id IN (SELECT id FROM (
  SELECT id
  FROM users
  WHERE LOWER(email) IN (
    'noraonyeka3@gmail.com',
    'tadenmosun@gmail.com',
    'tosinakingbade7@gmail.com',
    'michaelasereo@gmail.com',
    'chiamakasoniaeke@gmail.com',
    'ajayiodeborah@gmail.com',
    'awonaiketimmie@gmail.com',
    'arisoyinopemipograce@gmail.com',
    'clealthstudios@gmail.com',
    'asereope@gmail.com',
    'michaelasereoo@gmail.com'
  )
) AS to_delete_users);

DELETE FROM auth.users
WHERE LOWER(email) IN (
  'noraonyeka3@gmail.com',
  'tadenmosun@gmail.com',
  'tosinakingbade7@gmail.com',
  'michaelasereo@gmail.com',
  'chiamakasoniaeke@gmail.com',
  'ajayiodeborah@gmail.com',
  'awonaiketimmie@gmail.com',
  'arisoyinopemipograce@gmail.com',
  'clealthstudios@gmail.com',
  'asereope@gmail.com',
  'michaelasereoo@gmail.com'
);

COMMIT;
