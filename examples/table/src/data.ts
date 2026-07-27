import type { Role, Status, UserRowData } from "./model"

const firstNames = [
	"Ada",
	"Grace",
	"Linus",
	"Margaret",
	"Alan",
	"Barbara",
	"Edsger",
	"Frances",
	"Donald",
	"Radia",
] as const

const lastNames = [
	"Lovelace",
	"Hopper",
	"Torvalds",
	"Hamilton",
	"Turing",
	"Liskov",
	"Dijkstra",
	"Allen",
	"Knuth",
	"Perlman",
] as const

const roles: readonly Role[] = ["Admin", "Editor", "Viewer"]
const statuses: readonly Status[] = ["Active", "Inactive"]

export function createUsers(count = 200): UserRowData[] {
	return Array.from({ length: count }, (_, index) => {
		const firstName = firstNames[index % firstNames.length] as string
		const lastName = lastNames[
			Math.floor(index / firstNames.length) % lastNames.length
		] as string
		const suffix = String(index + 1).padStart(3, "0")

		return {
			name: `${firstName} ${lastName} ${suffix}`,
			email: `${firstName}.${lastName}.${suffix}@example.com`.toLowerCase(),
			role: roles[index % roles.length] as Role,
			status: statuses[index % statuses.length] as Status,
		}
	})
}
