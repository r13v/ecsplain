import {
	createWorld,
	defineComponent,
	defineQuery,
	type Entity,
	optional,
	type System,
	type SystemMiddleware,
	without,
} from "ecsplain"
import { describe, expect, it, vi } from "vitest"

const Name = defineComponent<{ value: string }>("Name")
const Count = defineComponent<number>("Count")
const Selected = defineComponent<true>("Selected")
const ExternalId = defineComponent<string>("ExternalId")

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

	it("spawns a complete entity in one notification batch", () => {
		const world = createWorld()
		const globalListener = vi.fn()
		const nameListener = vi.fn()
		world.subscribe(globalListener)
		world.subscribe(nameListener, { components: [Name] })

		const entity = world.spawn([Name, { value: "Ada" }], [Count, 1])

		expect(world.require(entity, Name)).toEqual({ value: "Ada" })
		expect(world.require(entity, Count)).toBe(1)
		expect(globalListener).toHaveBeenCalledTimes(1)
		expect(nameListener).toHaveBeenCalledTimes(1)
		expect(() => Reflect.apply(world.spawn, world, [])).toThrow(
			"Spawn requires at least one component",
		)
	})

	it("requires components when their absence violates an invariant", () => {
		const world = createWorld()
		const entity = world.create()

		expect(() => world.require(entity, Name)).toThrow(
			`Entity ${entity} does not have component "Name"`,
		)
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

	it("supports reusable optional and exclusion terms", () => {
		const world = createWorld()
		const first = world.spawn([Name, { value: "first" }], [Count, 1])
		const second = world.spawn([Name, { value: "second" }])
		const third = world.spawn(
			[Name, { value: "third" }],
			[Count, 3],
			[Selected, true],
		)
		const availableNames = defineQuery(Name, optional(Count), without(Selected))

		expect(world.query(availableNames)).toEqual([
			[first, { value: "first" }, 1],
			[second, { value: "second" }, undefined],
		])
		expect(world.query(Name, optional(Count), without(Selected))).toEqual([
			[first, { value: "first" }, 1],
			[second, { value: "second" }, undefined],
		])

		world.set(second, Selected, true)
		world.remove(third, Selected)

		expect(world.query(availableNames)).toEqual([
			[first, { value: "first" }, 1],
			[third, { value: "third" }, 3],
		])
	})

	it("enforces exact query cardinality", () => {
		const world = createWorld()

		expect(() => world.single(Name)).toThrow(
			"Expected exactly one entity matching query, found 0",
		)

		const entity = world.spawn([Name, { value: "only" }])
		expect(world.single(defineQuery(Name))).toEqual([entity, { value: "only" }])

		world.spawn([Name, { value: "second" }])
		expect(() => world.single(Name)).toThrow(
			"Expected exactly one entity matching query, found 2",
		)
	})
})

describe("secondary indexes", () => {
	it("tracks non-unique component values across their lifecycle", () => {
		const world = createWorld()
		const first = world.spawn([Count, 1])
		const second = world.spawn([Count, 1])
		const counts = world.index(Count)

		expect(counts.get(1)).toEqual([first, second])
		expect(counts.has(2)).toBe(false)

		world.run(currentWorld => {
			currentWorld.set(second, Count, 2)
			expect(counts.get(2)).toEqual([second])
		})
		expect(counts.get(1)).toEqual([first])
		expect(counts.get(2)).toEqual([second])

		world.remove(first, Count)
		world.destroy(second)
		expect(counts.has(1)).toBe(false)
		expect(counts.has(2)).toBe(false)
	})

	it("enforces unique keys without applying conflicting writes", () => {
		const world = createWorld()
		const first = world.spawn([ExternalId, "customer-1"])
		const byId = world.index(ExternalId, { unique: true })

		expect(byId.get("customer-1")).toBe(first)
		expect(world.index(ExternalId, { unique: true })).toBe(byId)

		const version = world.getVersion()
		expect(() => world.spawn([ExternalId, "customer-1"])).toThrow(
			'Component "ExternalId" already indexes value for entity',
		)
		expect(world.getVersion()).toBe(version)

		const second = world.spawn([ExternalId, "customer-2"])
		expect(() => world.set(second, ExternalId, "customer-1")).toThrow(
			'Component "ExternalId" already indexes value for entity',
		)
		expect(world.require(second, ExternalId)).toBe("customer-2")

		world.remove(first, ExternalId)
		world.set(second, ExternalId, "customer-1")
		expect(byId.get("customer-1")).toBe(second)
		expect(byId.has("customer-2")).toBe(false)
	})

	it("rejects a unique index when existing values already conflict", () => {
		const world = createWorld()
		world.spawn([ExternalId, "duplicate"])
		world.spawn([ExternalId, "duplicate"])

		expect(() => world.index(ExternalId, { unique: true })).toThrow(
			'Component "ExternalId" already indexes value for entity',
		)
	})
})

describe("system middleware", () => {
	it("runs registered middleware around every system in outermost order", () => {
		const events: string[] = []
		const first: SystemMiddleware = (execution, next) => {
			events.push(`first before ${execution.depth}`)
			const result = next()
			events.push(`first after ${execution.depth}`)
			return result
		}
		const second: SystemMiddleware = (execution, next) => {
			events.push(`second before ${execution.depth}`)
			const result = next()
			events.push(`second after ${execution.depth}`)
			return result
		}
		const world = createWorld({ middleware: [first, second] })
		const nested: System<void, string> = () => {
			events.push("nested system")
			return "nested result"
		}
		const outer: System<{ readonly label: string }, string> = (
			currentWorld,
			input,
		) => {
			events.push(`outer system ${input.label}`)
			expect(currentWorld.run(nested)).toBe("nested result")
			return "outer result"
		}

		expect(world.run(outer, { label: "input" })).toBe("outer result")

		expect(events).toEqual([
			"first before 0",
			"second before 0",
			"outer system input",
			"first before 1",
			"second before 1",
			"nested system",
			"second after 1",
			"first after 1",
			"second after 0",
			"first after 0",
		])
	})

	it("snapshots middleware and bypasses it for direct world mutations", () => {
		const events: string[] = []
		const original: SystemMiddleware = (_execution, next) => {
			events.push("original")
			return next()
		}
		const addedLater: SystemMiddleware = (_execution, next) => {
			events.push("added later")
			return next()
		}
		const middleware = [original]
		const world = createWorld({ middleware })
		middleware.push(addedLater)
		const entity = world.create()

		world.set(entity, Count, 1)
		world.update(entity, Count, current => current + 1)
		world.remove(entity, Count)
		const spawned = world.spawn([Count, 3])
		world.destroy(spawned)

		expect(events).toEqual([])

		world.run(() => undefined)

		expect(events).toEqual(["original"])
	})

	it("exposes the exact system function reference and input value", () => {
		const seen: Array<{
			readonly system: unknown
			readonly input: unknown
			readonly depth: number
		}> = []
		const middleware: SystemMiddleware = (execution, next) => {
			seen.push({
				system: execution.system,
				input: execution.input,
				depth: execution.depth,
			})
			return next()
		}
		const world = createWorld({ middleware: [middleware] })
		const entity = world.create()
		const input = { entity }
		const system: System<typeof input, Entity> = (
			_currentWorld,
			currentInput,
		) => currentInput.entity

		expect(world.run(system, input)).toBe(entity)
		expect(seen).toEqual([{ system, input, depth: 0 }])
	})

	it("preserves return values and thrown values across middleware", () => {
		const middleware: SystemMiddleware = (_execution, next) => next()
		const world = createWorld({ middleware: [middleware] })
		const result = { ok: true }
		const error = new Error("system failed")

		expect(world.run(() => result)).toBe(result)

		const thrownError = captureThrown(() => {
			world.run(() => {
				throw error
			})
		})
		expect(thrownError.threw).toBe(true)
		expect(thrownError.value).toBe(error)

		expect(
			captureThrown(() =>
				world.run(() => {
					throw undefined
				}),
			),
		).toEqual({ threw: true, value: undefined })
	})

	it("rejects middleware that skips next, calls next twice, or changes outcomes", () => {
		const skipNext = (() => undefined) as SystemMiddleware
		expect(() =>
			createWorld({ middleware: [skipNext] }).run(() => "value"),
		).toThrow("System middleware must call next() exactly once")

		const callsNextTwice = ((_execution, next) => {
			next()
			return next()
		}) as SystemMiddleware
		let systemCalls = 0
		expect(() =>
			createWorld({ middleware: [callsNextTwice] }).run(() => {
				systemCalls += 1
				return "value"
			}),
		).toThrow("System middleware must call next() exactly once")
		expect(systemCalls).toBe(1)

		const replacesResult = ((_execution, next) => {
			next()
			return "replacement"
		}) as SystemMiddleware
		expect(() =>
			createWorld({ middleware: [replacesResult] }).run(() => "value"),
		).toThrow("System middleware must return the next() result unchanged")

		const systemError = new Error("system failed")
		const middlewareError = new Error("middleware failed")
		const replacesError = ((_execution, next) => {
			try {
				return next()
			} catch {
				throw middlewareError
			}
		}) as SystemMiddleware
		const replacedError = captureThrown(() =>
			createWorld({ middleware: [replacesError] }).run(() => {
				throw systemError
			}),
		)
		expect(replacedError.threw).toBe(true)
		expect(replacedError.value).toBe(systemError)

		const swallowsUndefined = ((_execution, next) => {
			try {
				return next()
			} catch {
				return undefined
			}
		}) as SystemMiddleware
		expect(
			captureThrown(() =>
				createWorld({ middleware: [swallowsUndefined] }).run(() => {
					throw undefined
				}),
			),
		).toEqual({ threw: true, value: undefined })
	})

	it("rejects next calls deferred beyond the synchronous middleware frame", () => {
		let deferredNext: (() => unknown) | undefined
		const middleware = ((_execution, next) => {
			deferredNext = next
			return undefined
		}) as SystemMiddleware
		const world = createWorld({ middleware: [middleware] })
		let systemCalls = 0

		expect(() =>
			world.run(() => {
				systemCalls += 1
				return "value"
			}),
		).toThrow("System middleware must call next() exactly once")
		expect(systemCalls).toBe(0)
		expect(() => deferredNext?.()).toThrow(
			"System middleware must call next() synchronously",
		)
		expect(systemCalls).toBe(0)
	})

	it("propagates middleware thrown before next without running the system", () => {
		const error = new Error("middleware failed")
		const system = vi.fn()
		const middleware = (() => {
			throw error
		}) as SystemMiddleware

		const thrown = captureThrown(() =>
			createWorld({ middleware: [middleware] }).run(system),
		)

		expect(thrown.threw).toBe(true)
		expect(thrown.value).toBe(error)
		expect(system).not.toHaveBeenCalled()
	})

	it("commits writes and flushes once when middleware throws after next", () => {
		const error = new Error("middleware failed")
		const middleware = ((_execution, next) => {
			next()
			throw error
		}) as SystemMiddleware
		const world = createWorld({ middleware: [middleware] })
		const entity = world.create()
		const listener = vi.fn()
		world.subscribe(listener)

		const thrown = captureThrown(() =>
			world.run(currentWorld => {
				currentWorld.set(entity, Count, 1)
			}),
		)

		expect(thrown.threw).toBe(true)
		expect(thrown.value).toBe(error)
		expect(world.require(entity, Count)).toBe(1)
		expect(listener).toHaveBeenCalledTimes(1)
	})

	it("keeps execution failures primary over subscriber failures", () => {
		const systemError = new Error("system failed")
		const middlewareError = new Error("middleware failed")
		const subscriberError = new Error("subscriber failed")
		const firstWorld = createWorld()
		const firstEntity = firstWorld.create()
		firstWorld.subscribe(() => {
			throw subscriberError
		})

		const systemFailure = captureThrown(() =>
			firstWorld.run(currentWorld => {
				currentWorld.set(firstEntity, Count, 1)
				throw systemError
			}),
		)
		expect(systemFailure.threw).toBe(true)
		expect(systemFailure.value).toBe(systemError)

		const secondWorld = createWorld({
			middleware: [
				((_execution, next) => {
					next()
					throw middlewareError
				}) as SystemMiddleware,
			],
		})
		const secondEntity = secondWorld.create()
		secondWorld.subscribe(() => {
			throw subscriberError
		})

		const middlewareFailure = captureThrown(() =>
			secondWorld.run(currentWorld => {
				currentWorld.set(secondEntity, Count, 1)
			}),
		)
		expect(middlewareFailure.threw).toBe(true)
		expect(middlewareFailure.value).toBe(middlewareError)
	})

	it("restores execution depth after a failed nested run", () => {
		const depths: number[] = []
		const error = new Error("nested failed")
		const middleware: SystemMiddleware = (execution, next) => {
			depths.push(execution.depth)
			return next()
		}
		const world = createWorld({ middleware: [middleware] })

		expect(() =>
			world.run(currentWorld => {
				currentWorld.run(() => {
					throw error
				})
			}),
		).toThrow(error)
		world.run(() => undefined)

		expect(depths).toEqual([0, 1, 0])
	})

	it("completes middleware before the outer batch flush", () => {
		const events: string[] = []
		const middleware: SystemMiddleware = (_execution, next) => {
			events.push("middleware before")
			const result = next()
			events.push("middleware after")
			return result
		}
		const world = createWorld({ middleware: [middleware] })
		const entity = world.create()
		world.subscribe(() => {
			events.push("subscriber")
		})

		world.run(currentWorld => {
			currentWorld.set(entity, Count, 1)
			events.push("system")
		})

		expect(events).toEqual([
			"middleware before",
			"system",
			"middleware after",
			"subscriber",
		])
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
