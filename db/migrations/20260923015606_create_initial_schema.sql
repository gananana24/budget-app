-- migrate:up

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

CREATE TABLE public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.households (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  personal_owner_user_id uuid NOT NULL UNIQUE
    REFERENCES public.users(id) ON DELETE NO ACTION,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.household_members (
  household_id uuid NOT NULL
    REFERENCES public.households(id) ON DELETE CASCADE,
  user_id uuid NOT NULL
    REFERENCES public.users(id) ON DELETE NO ACTION,
  PRIMARY KEY (household_id, user_id)
);

CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid
    REFERENCES public.households(id) ON DELETE CASCADE,
  name text NOT NULL
    CHECK (
      char_length(name) BETWEEN 1 AND 50
      AND name !~ '^[[:space:]]'
      AND name !~ '[[:space:]]$'
    ),
  seed_key text
    CHECK (
      seed_key IN (
        'food',
        'daily_goods',
        'housing',
        'utilities',
        'communications',
        'transportation',
        'medical',
        'entertainment',
        'other'
      )
    ),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (household_id IS NULL AND seed_key IS NOT NULL)
    OR (household_id IS NOT NULL AND seed_key IS NULL)
  )
);

INSERT INTO public.categories (name, seed_key)
VALUES
  ('食費', 'food'),
  ('日用品', 'daily_goods'),
  ('住居費', 'housing'),
  ('水道光熱費', 'utilities'),
  ('通信費', 'communications'),
  ('交通費', 'transportation'),
  ('医療費', 'medical'),
  ('娯楽費', 'entertainment'),
  ('その他', 'other');

CREATE TABLE public.budget_periods (
  household_id uuid NOT NULL
    REFERENCES public.households(id) ON DELETE CASCADE,
  month_start date NOT NULL
    CHECK (EXTRACT(DAY FROM month_start) = 1),
  initialized_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (household_id, month_start)
);

CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL
    REFERENCES public.households(id) ON DELETE CASCADE,
  category_id uuid,
  expense_date date NOT NULL,
  amount integer NOT NULL
    CHECK (amount BETWEEN 1 AND 2147483647),
  memo text
    CHECK (char_length(memo) <= 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (household_id, id),
  FOREIGN KEY (category_id)
    REFERENCES public.categories(id)
    ON DELETE SET NULL
);

CREATE TABLE public.monthly_budgets (
  household_id uuid NOT NULL,
  month_start date NOT NULL
    CHECK (EXTRACT(DAY FROM month_start) = 1),
  category_id uuid NOT NULL,
  amount integer NOT NULL
    CHECK (amount BETWEEN 0 AND 2147483647),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (household_id, month_start, category_id),
  FOREIGN KEY (household_id, month_start)
    REFERENCES public.budget_periods(household_id, month_start)
    ON DELETE CASCADE,
  FOREIGN KEY (category_id)
    REFERENCES public.categories(id)
    ON DELETE CASCADE
);

CREATE UNIQUE INDEX categories_household_lower_name_idx
  ON public.categories (household_id, lower(name))
  WHERE household_id IS NOT NULL;

CREATE UNIQUE INDEX categories_system_lower_name_idx
  ON public.categories (lower(name))
  WHERE household_id IS NULL;

CREATE UNIQUE INDEX categories_system_seed_key_idx
  ON public.categories (seed_key)
  WHERE seed_key IS NOT NULL;

CREATE INDEX household_members_user_id_idx
  ON public.household_members (user_id);

CREATE INDEX expenses_household_date_idx
  ON public.expenses (
    household_id,
    expense_date DESC,
    created_at DESC,
    id DESC
  );

CREATE FUNCTION public.ensure_category_available_to_household()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.category_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.categories
    WHERE categories.id = NEW.category_id
      AND (
        categories.household_id IS NULL
        OR categories.household_id = NEW.household_id
      )
  ) THEN
    RAISE EXCEPTION 'category is not available to household'
      USING ERRCODE = '23503';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER expenses_ensure_category_available
BEFORE INSERT OR UPDATE OF household_id, category_id ON public.expenses
FOR EACH ROW
EXECUTE FUNCTION public.ensure_category_available_to_household();

CREATE TRIGGER monthly_budgets_ensure_category_available
BEFORE INSERT OR UPDATE OF household_id, category_id ON public.monthly_budgets
FOR EACH ROW
EXECUTE FUNCTION public.ensure_category_available_to_household();

CREATE FUNCTION public.protect_category_invariants()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' AND OLD.household_id IS NULL THEN
    RAISE EXCEPTION 'system categories cannot be deleted'
      USING ERRCODE = '23514';
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.household_id IS DISTINCT FROM NEW.household_id THEN
    RAISE EXCEPTION 'category scope cannot be changed'
      USING ERRCODE = '23514';
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.household_id IS NULL AND NEW IS DISTINCT FROM OLD THEN
    RAISE EXCEPTION 'system categories cannot be updated'
      USING ERRCODE = '23514';
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    IF NEW.household_id IS NOT NULL AND EXISTS (
        SELECT 1
        FROM public.categories
        WHERE categories.household_id IS NULL
          AND lower(categories.name) = lower(NEW.name)
      ) THEN
      RAISE EXCEPTION 'custom category name conflicts with a system category'
        USING ERRCODE = '23505';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER categories_protect_invariants
BEFORE INSERT OR UPDATE OR DELETE ON public.categories
FOR EACH ROW
EXECUTE FUNCTION public.protect_category_invariants();

-- migrate:down

DROP TRIGGER categories_protect_invariants ON public.categories;
DROP FUNCTION public.protect_category_invariants();
DROP TRIGGER monthly_budgets_ensure_category_available ON public.monthly_budgets;
DROP TRIGGER expenses_ensure_category_available ON public.expenses;
DROP FUNCTION public.ensure_category_available_to_household();
DROP TABLE public.monthly_budgets;
DROP TABLE public.expenses;
DROP TABLE public.budget_periods;
DROP TABLE public.categories;
DROP TABLE public.household_members;
DROP TABLE public.households;
DROP TABLE public.users;
