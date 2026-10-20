\restrict dbmate

-- Dumped from database version 15.18
-- Dumped by pg_dump version 15.18 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: ensure_category_available_to_household(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ensure_category_available_to_household() RETURNS trigger
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


--
-- Name: protect_category_invariants(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.protect_category_invariants() RETURNS trigger
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


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: budget_periods; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.budget_periods (
    household_id uuid NOT NULL,
    month_start date NOT NULL,
    initialized_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT budget_periods_month_start_check CHECK ((EXTRACT(day FROM month_start) = (1)::numeric))
);


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    household_id uuid,
    name text NOT NULL,
    seed_key text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    icon_name text DEFAULT 'tag'::text NOT NULL,
    CONSTRAINT categories_check CHECK ((((household_id IS NULL) AND (seed_key IS NOT NULL)) OR ((household_id IS NOT NULL) AND (seed_key IS NULL)))),
    CONSTRAINT categories_icon_name_check CHECK ((((char_length(icon_name) >= 1) AND (char_length(icon_name) <= 64)) AND (icon_name ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::text))),
    CONSTRAINT categories_name_check CHECK ((((char_length(name) >= 1) AND (char_length(name) <= 50)) AND (name !~ '^[[:space:]]'::text) AND (name !~ '[[:space:]]$'::text))),
    CONSTRAINT categories_seed_key_check CHECK ((seed_key = ANY (ARRAY['food'::text, 'daily_goods'::text, 'housing'::text, 'utilities'::text, 'communications'::text, 'transportation'::text, 'medical'::text, 'entertainment'::text, 'other'::text])))
);


--
-- Name: expenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    household_id uuid NOT NULL,
    category_id uuid,
    expense_date date NOT NULL,
    amount integer NOT NULL,
    memo text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT expenses_amount_check CHECK (((amount >= 1) AND (amount <= 2147483647))),
    CONSTRAINT expenses_memo_check CHECK ((char_length(memo) <= 500))
);


--
-- Name: household_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.household_members (
    household_id uuid NOT NULL,
    user_id uuid NOT NULL
);


--
-- Name: households; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.households (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    personal_owner_user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: monthly_budgets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.monthly_budgets (
    household_id uuid NOT NULL,
    month_start date NOT NULL,
    category_id uuid NOT NULL,
    amount integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT monthly_budgets_amount_check CHECK (((amount >= 0) AND (amount <= 2147483647))),
    CONSTRAINT monthly_budgets_month_start_check CHECK ((EXTRACT(day FROM month_start) = (1)::numeric))
);


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations (
    version character varying NOT NULL
);


--
-- Name: subscription_occurrences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscription_occurrences (
    subscription_id uuid NOT NULL,
    household_id uuid NOT NULL,
    schedule_version integer NOT NULL,
    occurrence_index integer NOT NULL,
    nominal_date date NOT NULL,
    payment_date date NOT NULL,
    expense_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT subscription_occurrences_occurrence_index_check CHECK ((occurrence_index >= 0)),
    CONSTRAINT subscription_occurrences_schedule_version_check CHECK ((schedule_version > 0))
);


--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    household_id uuid NOT NULL,
    name text NOT NULL,
    amount integer NOT NULL,
    category_id uuid,
    interval_unit text NOT NULL,
    anchor_date date NOT NULL,
    next_nominal_date date NOT NULL,
    occurrence_index integer DEFAULT 0 NOT NULL,
    schedule_version integer DEFAULT 1 NOT NULL,
    holiday_adjustment text DEFAULT 'none'::text NOT NULL,
    ended_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    billing_month integer,
    billing_day integer NOT NULL,
    CONSTRAINT subscriptions_amount_check CHECK (((amount >= 1) AND (amount <= 2147483647))),
    CONSTRAINT subscriptions_billing_day_check CHECK (((billing_day >= 1) AND (billing_day <= 31))),
    CONSTRAINT subscriptions_billing_month_check CHECK (((billing_month >= 1) AND (billing_month <= 12))),
    CONSTRAINT subscriptions_billing_month_required_check CHECK ((((interval_unit = 'month'::text) AND (billing_month IS NULL)) OR ((interval_unit = 'year'::text) AND (billing_month IS NOT NULL)))),
    CONSTRAINT subscriptions_holiday_adjustment_check CHECK ((holiday_adjustment = ANY (ARRAY['none'::text, 'previous'::text, 'next'::text]))),
    CONSTRAINT subscriptions_interval_unit_check CHECK ((interval_unit = ANY (ARRAY['month'::text, 'year'::text]))),
    CONSTRAINT subscriptions_name_check CHECK ((((char_length(name) >= 1) AND (char_length(name) <= 50)) AND (name = btrim(name)))),
    CONSTRAINT subscriptions_occurrence_index_check CHECK ((occurrence_index >= 0)),
    CONSTRAINT subscriptions_schedule_version_check CHECK ((schedule_version > 0))
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    clerk_user_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: budget_periods budget_periods_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_periods
    ADD CONSTRAINT budget_periods_pkey PRIMARY KEY (household_id, month_start);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: expenses expenses_household_id_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_household_id_id_key UNIQUE (household_id, id);


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


--
-- Name: household_members household_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.household_members
    ADD CONSTRAINT household_members_pkey PRIMARY KEY (household_id, user_id);


--
-- Name: households households_personal_owner_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.households
    ADD CONSTRAINT households_personal_owner_user_id_key UNIQUE (personal_owner_user_id);


--
-- Name: households households_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.households
    ADD CONSTRAINT households_pkey PRIMARY KEY (id);


--
-- Name: monthly_budgets monthly_budgets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monthly_budgets
    ADD CONSTRAINT monthly_budgets_pkey PRIMARY KEY (household_id, month_start, category_id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: subscription_occurrences subscription_occurrences_expense_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_occurrences
    ADD CONSTRAINT subscription_occurrences_expense_id_key UNIQUE (expense_id);


--
-- Name: subscription_occurrences subscription_occurrences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_occurrences
    ADD CONSTRAINT subscription_occurrences_pkey PRIMARY KEY (subscription_id, schedule_version, occurrence_index);


--
-- Name: subscriptions subscriptions_household_id_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_household_id_id_key UNIQUE (household_id, id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: users users_clerk_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_clerk_user_id_key UNIQUE (clerk_user_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: categories_household_lower_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX categories_household_lower_name_idx ON public.categories USING btree (household_id, lower(name)) WHERE (household_id IS NOT NULL);


--
-- Name: categories_system_lower_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX categories_system_lower_name_idx ON public.categories USING btree (lower(name)) WHERE (household_id IS NULL);


--
-- Name: categories_system_seed_key_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX categories_system_seed_key_idx ON public.categories USING btree (seed_key) WHERE (seed_key IS NOT NULL);


--
-- Name: expenses_household_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX expenses_household_date_idx ON public.expenses USING btree (household_id, expense_date DESC, created_at DESC, id DESC);


--
-- Name: household_members_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX household_members_user_id_idx ON public.household_members USING btree (user_id);


--
-- Name: subscription_occurrences_household_payment_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX subscription_occurrences_household_payment_idx ON public.subscription_occurrences USING btree (household_id, payment_date);


--
-- Name: subscriptions_active_household_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX subscriptions_active_household_idx ON public.subscriptions USING btree (household_id, next_nominal_date) WHERE (ended_at IS NULL);


--
-- Name: categories categories_protect_invariants; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER categories_protect_invariants BEFORE INSERT OR DELETE OR UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.protect_category_invariants();


--
-- Name: expenses expenses_ensure_category_available; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER expenses_ensure_category_available BEFORE INSERT OR UPDATE OF household_id, category_id ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.ensure_category_available_to_household();


--
-- Name: monthly_budgets monthly_budgets_ensure_category_available; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER monthly_budgets_ensure_category_available BEFORE INSERT OR UPDATE OF household_id, category_id ON public.monthly_budgets FOR EACH ROW EXECUTE FUNCTION public.ensure_category_available_to_household();


--
-- Name: subscriptions subscriptions_ensure_category_available; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER subscriptions_ensure_category_available BEFORE INSERT OR UPDATE OF household_id, category_id ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.ensure_category_available_to_household();


--
-- Name: budget_periods budget_periods_household_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_periods
    ADD CONSTRAINT budget_periods_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE;


--
-- Name: categories categories_household_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE;


--
-- Name: expenses expenses_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: expenses expenses_household_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE;


--
-- Name: household_members household_members_household_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.household_members
    ADD CONSTRAINT household_members_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE;


--
-- Name: household_members household_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.household_members
    ADD CONSTRAINT household_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: households households_personal_owner_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.households
    ADD CONSTRAINT households_personal_owner_user_id_fkey FOREIGN KEY (personal_owner_user_id) REFERENCES public.users(id);


--
-- Name: monthly_budgets monthly_budgets_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monthly_budgets
    ADD CONSTRAINT monthly_budgets_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;


--
-- Name: monthly_budgets monthly_budgets_household_id_month_start_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monthly_budgets
    ADD CONSTRAINT monthly_budgets_household_id_month_start_fkey FOREIGN KEY (household_id, month_start) REFERENCES public.budget_periods(household_id, month_start) ON DELETE CASCADE;


--
-- Name: subscription_occurrences subscription_occurrences_expense_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_occurrences
    ADD CONSTRAINT subscription_occurrences_expense_id_fkey FOREIGN KEY (expense_id) REFERENCES public.expenses(id) ON DELETE SET NULL;


--
-- Name: subscription_occurrences subscription_occurrences_household_id_subscription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_occurrences
    ADD CONSTRAINT subscription_occurrences_household_id_subscription_id_fkey FOREIGN KEY (household_id, subscription_id) REFERENCES public.subscriptions(household_id, id) ON DELETE CASCADE;


--
-- Name: subscriptions subscriptions_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: subscriptions subscriptions_household_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict dbmate


--
-- Dbmate schema migrations
--

INSERT INTO public.schema_migrations (version) VALUES
    ('20260923015606'),
    ('20261008103500'),
    ('20261019000000'),
    ('20261020000000');
