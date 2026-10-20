-- migrate:up
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 50 AND name = btrim(name)),
  amount integer NOT NULL CHECK (amount BETWEEN 1 AND 2147483647),
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  interval_unit text NOT NULL CHECK (interval_unit IN ('month', 'year')),
  billing_month integer CHECK (billing_month BETWEEN 1 AND 12),
  billing_day integer NOT NULL CHECK (billing_day BETWEEN 1 AND 31),
  CONSTRAINT subscriptions_billing_month_required_check CHECK ((interval_unit = 'month' AND billing_month IS NULL) OR (interval_unit = 'year' AND billing_month IS NOT NULL)),
  anchor_date date NOT NULL,
  next_nominal_date date NOT NULL,
  occurrence_index integer NOT NULL DEFAULT 0 CHECK (occurrence_index >= 0),
  schedule_version integer NOT NULL DEFAULT 1 CHECK (schedule_version > 0),
  holiday_adjustment text NOT NULL DEFAULT 'none'
    CHECK (holiday_adjustment IN ('none', 'previous', 'next')),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (household_id, id)
);

CREATE INDEX subscriptions_active_household_idx
  ON public.subscriptions (household_id, next_nominal_date)
  WHERE ended_at IS NULL;

CREATE TRIGGER subscriptions_ensure_category_available
BEFORE INSERT OR UPDATE OF household_id, category_id ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.ensure_category_available_to_household();

-- migrate:down
DROP TRIGGER subscriptions_ensure_category_available ON public.subscriptions;
DROP TABLE public.subscriptions;
