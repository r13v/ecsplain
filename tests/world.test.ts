import {
	createWorld,
	defineComponent,
	type Entity,
	type System,
} from "ecsplain"
import { describe, expect, it, vi } from "vitest"

const Name = defineComponent<{ value: string }>("Name")
const Count = defineComponent<number>("Count")
const Selected = defineComponent<true>("Selected")

function captureThrown(action: () => void): { threw: boolean; value: unknown } {
	try {
		action()
		return { threw: false, value: undefined }
	} catch (error) {
		return { threw: true, value: error }
	}
}

describe("component tokens", () => {
	it("uses identity even when diagnostic names match", () => {
		const first = defineComponent<number>("Duplicate")
		const second = defineComponent<number>("Duplicate")

		expect(first).not.toBe(second)
		expect(first.name).toBe("Duplicate")
	})

	it("rejects empty names", () => {
		expect(() => defineComponent("  ")).toThrow(
			"A component name must not be empty",
		)
	})
})

describe("entity and component lifecycle", () => {
	it("creates opaque, increasing, non-reused entities", () => {
		const world = createWorld()
		const first = world.create()
		const second = world.create()

		world.destroy(first)

		expect(second).toBeGreaterThan(first)
		expect(world.create()).toBeGreaterThan(second)
		expect(world.exists(first)).toBe(false)
	})

	it("supports get, set, update, remove, and fail-fast entity access", () => {
		const world = createWorld()
		const entity = world.create()

		expect(world.get(entity, Name)).toBeUndefined()
		expect(world.has(entity, Name)).toBe(false)

		world.set(entity, Name, { value: "Ada" })
		world.update(entity, Name, current => ({
			value: `${current.value} Lovelace`,
		}))

		expect(world.get(entity, Name)).toEqual({ value: "Ada Lovelace" })
		expect(world.remove(entity, Name)).toBe(true)
		expect(world.remove(entity, Name)).toBe(false)
		expect(() => world.update(entity, Name, value => value)).toThrow(
			'does not have component "Name"',
		)

		world.destroy(entity)

		expect(() => world.get(entity, Name)).toThrow("does not exist")
		expect(() => world.destroy(entity)).toThrow("does not exist")
	})

	it("reserves undefined for a missing component", () => {
		const world = createWorld()
		const entity = world.create()

		expect(() =>
			world.set(entity, Name, undefined as unknown as { value: string }),
		).toThrow("cannot store undefined")
	})

	it("treats Object.is-equal writes as no-ops", () => {
		const world = createWorld()
		const entity = world.create()
		const value = { value: "same reference" }
		const listener = vi.fn()

		world.set(entity, Name, value)
		world.subscribe(listener)
		const version = world.getVersion()

		world.set(entity, Name, value)
		world.update(entity, Name, current => current)

		expect(listener).not.toHaveBeenCalled()
		expect(world.getVersion()).toBe(version)
	})
})

describe("queries", () => {
	it("returns deterministic snapshots ordered by entity id", () => {
		const world = createWorld()
		const first = world.create()
		const second = world.create()
		const third = world.create()

		world.set(third, Name, { value: "third" })
		world.set(first, Name, { value: "first" })
		world.set(second, Name, { value: "second" })
		world.set(first, Count, 1)
		world.set(third, Count, 3)

		expect(world.query(Name, Count)).toEqual([
			[first, { value: "first" }, 1],
			[third, { value: "third" }, 3],
		])
	})

	it("returns a snapshot that is safe to iterate while mutating", () => {
		const world = createWorld()
		const entities = Array.from({ length: 3 }, () => world.create())

		for (const [index, entity] of entities.entries()) {
			world.set(entity, Count, index)
		}

		const visited: Entity[] = []
		for (const [entity] of world.query(Count)) {
			visited.push(entity)
			world.remove(entity, Count)
		}

		expect(visited).toEqual(entities)
		expect(world.query(Count)).toEqual([])
	})
})

describe("batches and subscriptions", () => {
	it("notifies matching scopes once for nested systems", () => {
		const world = createWorld()
		const entity = world.create()
		const globalListener = vi.fn()
		const nameListener = vi.fn()
		const exactListener = vi.fn()
		const unrelatedListener = vi.fn()

		world.subscribe(globalListener)
		world.subscribe(nameListener, { components: [Name] })
		world.subscribe(exactListener, { entity, component: Name })
		world.subscribe(unrelatedListener, { components: [Selected] })

		const nested: System<void> = currentWorld => {
			currentWorld.set(entity, Count, 2)
			currentWorld.set(entity, Name, { value: "nested" })
		}

		world.run(currentWorld => {
			currentWorld.set(entity, Name, { value: "outer" })
			currentWorld.run(nested)
		})

		expect(globalListener).toHaveBeenCalledTimes(1)
		expect(nameListener).toHaveBeenCalledTimes(1)
		expect(exactListener).toHaveBeenCalledTimes(1)
		expect(unrelatedListener).not.toHaveBeenCalled()
		expect(world.getVersion({ components: [Name] })).toBe(world.getVersion())
		expect(world.getVersion({ entity, component: Selected })).toBe(0)
	})

	it("keeps changes and notifies when a system throws", () => {
		const world = createWorld()
		const entity = world.create()
		const listener = vi.fn()
		world.subscribe(listener)

		expect(() =>
			world.run(() => {
				world.set(entity, Name, { value: "committed" })
				throw new Error("system failed")
			}),
		).toThrow("system failed")

		expect(world.get(entity, Name)).toEqual({ value: "committed" })
		expect(listener).toHaveBeenCalledTimes(1)
	})

	it("preserves undefined thrown across systems, updates, and subscribers", () => {
		const world = createWorld()
		const entity = world.create()
		world.set(entity, Count, 1)

		expect(
			captureThrown(() =>
				world.run(() => {
					throw undefined
				}),
			),
		).toEqual({ threw: true, value: undefined })

		expect(
			captureThrown(() =>
				world.update(entity, Count, () => {
					throw undefined
				}),
			),
		).toEqual({ threw: true, value: undefined })

		const secondListener = vi.fn()
		world.subscribe(() => {
			throw undefined
		})
		world.subscribe(secondListener)

		expect(captureThrown(() => world.set(entity, Count, 2))).toEqual({
			threw: true,
			value: undefined,
		})
		expect(secondListener).toHaveBeenCalledTimes(1)
	})

	it("rejects subscriber mutations but still calls other listeners", () => {
		const world = createWorld()
		const entity = world.create()
		const secondListener = vi.fn()

		world.subscribe(() => {
			world.set(entity, Count, 2)
		})
		world.subscribe(secondListener)

		expect(() => world.set(entity, Count, 1)).toThrow(
			"cannot be changed from a subscriber",
		)
		expect(world.get(entity, Count)).toBe(1)
		expect(secondListener).toHaveBeenCalledTimes(1)
	})

	it("notifies exact and component scopes when an entity is destroyed", () => {
		const world = createWorld()
		const entity = world.create()
		world.set(entity, Name, { value: "temporary" })

		const exactListener = vi.fn()
		const componentListener = vi.fn()
		world.subscribe(exactListener, { entity, component: Name })
		world.subscribe(componentListener, { components: [Name] })

		world.destroy(entity)

		expect(exactListener).toHaveBeenCalledTimes(1)
		expect(componentListener).toHaveBeenCalledTimes(1)
		expect(world.getVersion({ entity, component: Name })).toBe(
			world.getVersion(),
		)
	})
})
