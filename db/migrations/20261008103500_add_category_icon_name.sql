-- migrate:up

ALTER TABLE public.categories
  ADD COLUMN icon_name text NOT NULL DEFAULT 'tag'
    CHECK (char_length(icon_name) BETWEEN 1 AND 64 AND icon_name ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

ALTER TABLE public.categories DISABLE TRIGGER categories_protect_invariants;

UPDATE public.categories
SET icon_name = CASE seed_key
  WHEN 'food' THEN 'utensils'
  WHEN 'daily_goods' THEN 'shopping-basket'
  WHEN 'housing' THEN 'house'
  WHEN 'utilities' THEN 'droplets'
  WHEN 'communications' THEN 'smartphone'
  WHEN 'transportation' THEN 'train-front'
  WHEN 'medical' THEN 'heart-pulse'
  WHEN 'entertainment' THEN 'gamepad-2'
  WHEN 'other' THEN 'ellipsis'
  ELSE icon_name
END
WHERE seed_key IS NOT NULL;

ALTER TABLE public.categories ENABLE TRIGGER categories_protect_invariants;

-- migrate:down

ALTER TABLE public.categories DROP COLUMN icon_name;
