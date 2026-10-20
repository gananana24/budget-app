import type { Client } from "pg"
import type { HouseholdId } from "../../../domain/household/value-objects/household-id"
import { SubscriptionNotFoundError } from "../../../domain/subscription/subscription-not-found-error"
import { Subscription, type SubscriptionFields } from "../../../domain/subscription/subscription"
import type { SubscriptionRepository } from "../../../domain/subscription/subscription-repository"

const columns = `id::text AS id, household_id::text AS household_id, name, amount,
 category_id::text AS category_id, interval_unit, billing_month, billing_day, anchor_date::text AS anchor_date,
 next_nominal_date::text AS next_nominal_date, holiday_adjustment, occurrence_index,
 schedule_version, ended_at::text AS ended_at`

type Row = Record<string, unknown>

function read(row: Row, householdId: HouseholdId): Subscription {
	if (
		typeof row.id !== "string" ||
		row.household_id !== householdId.value ||
		typeof row.name !== "string" ||
		typeof row.amount !== "number" ||
		(row.category_id !== null && typeof row.category_id !== "string") ||
		(row.interval_unit !== "month" && row.interval_unit !== "year") ||
		(row.billing_month !== null && typeof row.billing_month !== "number") ||
		typeof row.billing_day !== "number" ||
		typeof row.anchor_date !== "string" ||
		typeof row.next_nominal_date !== "string" ||
		(row.holiday_adjustment !== "none" &&
			row.holiday_adjustment !== "previous" &&
			row.holiday_adjustment !== "next") ||
		typeof row.occurrence_index !== "number" ||
		typeof row.schedule_version !== "number" ||
		(row.ended_at !== null && typeof row.ended_at !== "string")
	)
		throw new Error("Invalid subscription row")
	const fields: SubscriptionFields = {
		name: row.name,
		amount: row.amount,
		categoryId: row.category_id,
		intervalUnit: row.interval_unit,
		billingMonth: row.billing_month,
		billingDay: row.billing_day,
		anchorDate: row.anchor_date,
		nextNominalDate: row.next_nominal_date,
		holidayAdjustment: row.holiday_adjustment,
	}
	return new Subscription(
		row.id,
		householdId,
		fields,
		row.occurrence_index,
		row.schedule_version,
		row.ended_at,
	)
}

function translateCategoryError(error: unknown): never {
	if (typeof error === "object" && error !== null && "code" in error && error.code === "23503") {
		throw new SubscriptionNotFoundError()
	}
	throw error
}

export class PostgresSubscriptionRepository implements SubscriptionRepository {
	constructor(private readonly client: Client) {}

	async findActive(householdId: HouseholdId): Promise<readonly Subscription[]> {
		const result = await this.client.query(
			`SELECT ${columns} FROM public.subscriptions WHERE household_id = $1::uuid AND ended_at IS NULL ORDER BY next_nominal_date, created_at, id`,
			[householdId.value],
		)
		return result.rows.map((row: Row) => read(row, householdId))
	}

	async findActiveById(householdId: HouseholdId, id: string): Promise<Subscription | null> {
		const result = await this.client.query(
			`SELECT ${columns} FROM public.subscriptions WHERE household_id = $1::uuid AND id = $2::uuid AND ended_at IS NULL`,
			[householdId.value, id],
		)
		return result.rowCount === 1 ? read(result.rows[0], householdId) : null
	}

	async create(subscription: Subscription): Promise<Subscription> {
		const { fields } = subscription
		try {
			const result = await this.client.query(
				`INSERT INTO public.subscriptions
				 (id, household_id, name, amount, category_id, interval_unit, billing_month, billing_day, anchor_date, next_nominal_date, holiday_adjustment)
				 VALUES ($1::uuid, $2::uuid, $3, $4, $5::uuid, $6, $7, $8, $9::date, $10::date, $11)
				 RETURNING ${columns}`,
				[
					subscription.id,
					subscription.householdId.value,
					fields.name,
					fields.amount,
					fields.categoryId,
					fields.intervalUnit,
					fields.billingMonth,
					fields.billingDay,
					fields.anchorDate,
					fields.nextNominalDate,
					fields.holidayAdjustment,
				],
			)
			return read(result.rows[0], subscription.householdId)
		} catch (error) {
			translateCategoryError(error)
		}
	}

	async update(subscription: Subscription): Promise<Subscription | null> {
		const { fields } = subscription
		try {
			const result = await this.client.query(
				`UPDATE public.subscriptions SET name=$3, amount=$4, category_id=$5::uuid,
				 interval_unit=$6, billing_month=$7, billing_day=$8, anchor_date=$9::date, next_nominal_date=$10::date,
				 holiday_adjustment=$11, occurrence_index=0, schedule_version=$12, updated_at=now()
				 WHERE household_id=$1::uuid AND id=$2::uuid AND ended_at IS NULL RETURNING ${columns}`,
				[
					subscription.householdId.value,
					subscription.id,
					fields.name,
					fields.amount,
					fields.categoryId,
					fields.intervalUnit,
					fields.billingMonth,
					fields.billingDay,
					fields.anchorDate,
					fields.nextNominalDate,
					fields.holidayAdjustment,
					subscription.scheduleVersion,
				],
			)
			return result.rowCount === 1 ? read(result.rows[0], subscription.householdId) : null
		} catch (error) {
			translateCategoryError(error)
		}
	}

	async end(subscription: Subscription): Promise<boolean> {
		const result = await this.client.query(
			"UPDATE public.subscriptions SET ended_at=now(), updated_at=now() WHERE household_id=$1::uuid AND id=$2::uuid AND ended_at IS NULL RETURNING id",
			[subscription.householdId.value, subscription.id],
		)
		return result.rowCount === 1
	}
}
