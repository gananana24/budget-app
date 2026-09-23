-- migrate:up

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

CREATE TABLE public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.households (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  personal_owner_user_id uuid NOT NULL
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
  household_id uuid NOT NULL
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
  hidden_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (household_id, id)
);

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
  FOREIGN KEY (household_id, category_id)
    REFERENCES public.categories(household_id, id)
    ON DELETE NO ACTION
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
  FOREIGN KEY (household_id, category_id)
    REFERENCES public.categories(household_id, id)
    ON DELETE NO ACTION
);

CREATE UNIQUE INDEX categories_household_lower_name_idx
  ON public.categories (household_id, lower(name));

CREATE UNIQUE INDEX categories_household_seed_key_idx
  ON public.categories (household_id, seed_key)
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

CREATE FUNCTION public.seed_default_categories_for_household()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.categories (household_id, name, seed_key)
  VALUES
    (NEW.id, '食費', 'food'),
    (NEW.id, '日用品', 'daily_goods'),
    (NEW.id, '住居費', 'housing'),
    (NEW.id, '水道光熱費', 'utilities'),
    (NEW.id, '通信費', 'communications'),
    (NEW.id, '交通費', 'transportation'),
    (NEW.id, '医療費', 'medical'),
    (NEW.id, '娯楽費', 'entertainment'),
    (NEW.id, 'その他', 'other');

  RETURN NEW;
END;
$$;

CREATE TRIGGER households_seed_default_categories
AFTER INSERT ON public.households
FOR EACH ROW
EXECUTE FUNCTION public.seed_default_categories_for_household();

-- migrate:down

DROP TRIGGER households_seed_default_categories ON public.households;
DROP FUNCTION public.seed_default_categories_for_household();
DROP TABLE public.monthly_budgets;
DROP TABLE public.expenses;
DROP TABLE public.budget_periods;
DROP TABLE public.categories;
DROP TABLE public.household_members;
DROP TABLE public.households;
DROP TABLE public.users;
