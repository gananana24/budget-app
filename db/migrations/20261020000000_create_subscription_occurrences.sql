-- migrate:up
CREATE TABLE public.subscription_occurrences (
  subscription_id uuid NOT NULL,
  household_id uuid NOT NULL,
  schedule_version integer NOT NULL CHECK (schedule_version > 0),
  occurrence_index integer NOT NULL CHECK (occurrence_index >= 0),
  nominal_date date NOT NULL,
  payment_date date NOT NULL,
  expense_id uuid UNIQUE REFERENCES public.expenses(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (subscription_id, schedule_version, occurrence_index),
  FOREIGN KEY (household_id, subscription_id)
    REFERENCES public.subscriptions(household_id, id) ON DELETE CASCADE
);

CREATE INDEX subscription_occurrences_household_payment_idx
  ON public.subscription_occurrences (household_id, payment_date);

-- migrate:down
DROP TABLE public.subscription_occurrences;
