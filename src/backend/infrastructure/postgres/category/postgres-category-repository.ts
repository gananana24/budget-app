import type { Client } from "pg"
import { CategoryNameConflictError } from "../../../domain/category/exceptions/category-name-conflict-error"
import type {
	Category,
	CategoryRepository,
} from "../../../domain/category/repositories/category-repository"
import type { CategoryIconName } from "../../../domain/category/value-objects/category-icon-name"
import type { CategoryId } from "../../../domain/category/value-objects/category-id"
import type { CategoryName } from "../../../domain/category/value-objects/category-name"
import type { HouseholdId } from "../../../domain/household/value-objects/household-id"

const CATEGORY_COLUMNS = "id::text AS id, name, icon_name, household_id IS NULL AS is_initial"
const INITIAL_ORDER = `CASE seed_key
  WHEN 'food' THEN 1 WHEN 'daily_goods' THEN 2 WHEN 'housing' THEN 3
  WHEN 'utilities' THEN 4 WHEN 'communications' THEN 5 WHEN 'transportation' THEN 6
  WHEN 'medical' THEN 7 WHEN 'entertainment' THEN 8 WHEN 'other' THEN 9 ELSE 10 END`

function readCategory(value: unknown): Category {
	if (typeof value !== "object" || value === null) throw new Error("Invalid category row")
	const row = value as Record<string, unknown>
	if (
		typeof row.id !== "string" ||
		typeof row.name !== "string" ||
		typeof row.icon_name !== "string" ||
		typeof row.is_initial !== "boolean"
	) {
		throw new Error("Invalid category fields")
	}
	return { id: row.id, name: row.name, iconName: row.icon_name, isInitial: row.is_initial }
}

function rethrowNameConflict(error: unknown): never {
	if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
		throw new CategoryNameConflictError()
	}
	throw error
}

export class PostgresCategoryRepository implements CategoryRepository {
	constructor(private readonly client: Client) {}

	async findAll(householdId: HouseholdId): Promise<readonly Category[]> {
		const result = await this.client.query(
			`SELECT ${CATEGORY_COLUMNS} FROM public.categories
			 WHERE household_id IS NULL OR household_id = $1::uuid
			 ORDER BY ${INITIAL_ORDER}, created_at, id`,
			[householdId.value],
		)
		return result.rows.map(readCategory)
	}

	async create(
		householdId: HouseholdId,
		name: CategoryName,
		iconName: CategoryIconName,
	): Promise<Category> {
		try {
			const result = await this.client.query(
				`INSERT INTO public.categories (household_id, name, icon_name) VALUES ($1::uuid, $2::text, $3::text)
				 RETURNING ${CATEGORY_COLUMNS}`,
				[householdId.value, name.value, iconName.value],
			)
			return readCategory(result.rows[0])
		} catch (error) {
			rethrowNameConflict(error)
		}
	}

	async update(
		householdId: HouseholdId,
		id: CategoryId,
		name: CategoryName,
		iconName: CategoryIconName,
	): Promise<Category | null> {
		try {
			const result = await this.client.query(
				`UPDATE public.categories SET name = $3::text, icon_name = $4::text, updated_at = now()
				 WHERE household_id = $1::uuid AND id = $2::uuid
				 RETURNING ${CATEGORY_COLUMNS}`,
				[householdId.value, id.value, name.value, iconName.value],
			)
			return result.rowCount === 1 ? readCategory(result.rows[0]) : null
		} catch (error) {
			rethrowNameConflict(error)
		}
	}

	async delete(householdId: HouseholdId, id: CategoryId): Promise<boolean> {
		const result = await this.client.query(
			"DELETE FROM public.categories WHERE household_id = $1::uuid AND id = $2::uuid RETURNING id",
			[householdId.value, id.value],
		)
		return result.rowCount === 1
	}
}
