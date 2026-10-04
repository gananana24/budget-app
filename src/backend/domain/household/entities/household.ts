import type { UserId } from "../../user/value-objects/user-id"
import { HouseholdId } from "../value-objects/household-id"

export class Household {
	private constructor(
		readonly id: HouseholdId,
		readonly personalOwnerUserId: UserId,
	) {}

	static createPersonal(personalOwnerUserId: UserId): Household {
		return new Household(HouseholdId.generate(), personalOwnerUserId)
	}

	static restore(id: HouseholdId, personalOwnerUserId: UserId): Household {
		return new Household(id, personalOwnerUserId)
	}

	equals(other: Household): boolean {
		return this.id.equals(other.id)
	}
}
