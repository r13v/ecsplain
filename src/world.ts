import type {
	AnyComponentToken,
	ComponentData,
	ComponentInput,
} from "./component"

declare const entityBrand: unique symbol

export type Entity = number & { readonly [entityBrand]: true }

export type System<Input = void, Output = void> = (
	world: World,
	input: Input,
) => Output

export type QueryResult<Tokens extends readonly AnyComponentToken[]> = Array<
	[
		entity: Entity,
		...components: {
			-readonly [Index in keyof Tokens]: ComponentData<Tokens[Index]>
		},
	]
>

export type SubscriptionScope =
	| {
			readonly components: readonly [AnyComponentToken, ...AnyComponentToken[]]
	  }
	| {
			readonly entity: Entity
			readonly component: AnyComponentToken
	  }

export interface World {
	create(): Entity
	destroy(entity: Entity): void
	exists(entity: Entity): boolean
	get<Token extends AnyComponentToken>(
		entity: Entity,
		component: Token,
	): ComponentData<Token> | undefined
	has(entity: Entity, component: AnyComponentToken): boolean
	set<Token extends AnyComponentToken>(
		entity: Entity,
		component: Token,
		value: ComponentInput<Token>,
	): void
	update<Token extends AnyComponentToken>(
		entity: Entity,
		component: Token,
		updater: (current: ComponentData<Token>) => ComponentInput<Token>,
	): void
	remove(entity: Entity, component: AnyComponentToken): boolean
	query<
		const Tokens extends readonly [AnyComponentToken, ...AnyComponentToken[]],
	>(...components: Tokens): QueryResult<Tokens>
	run<Output>(system: System<void, Output>): Output
	run<Input, Output>(system: System<Input, Output>, input: Input): Output
	subscribe(listener: () => void, scope?: SubscriptionScope): () => void
	getVersion(scope?: SubscriptionScope): number
}

class WorldState implements World {
	readonly #entities = new Set<Entity>()
	readonly #stores = new Map<AnyComponentToken, Map<Entity, unknown>>()
	readonly #globalListeners = new Set<() => void>()
	readonly #componentListeners = new Map<AnyComponentToken, Set<() => void>>()
	readonly #exactListeners = new Map<
		AnyComponentToken,
		Map<Entity, Set<() => void>>
	>()
	readonly #componentVersions = new Map<AnyComponentToken, number>()
	readonly #exactVersions = new Map<AnyComponentToken, Map<Entity, number>>()

	#nextEntity = 1
	#version = 0
	#batchDepth = 0
	#notifying = false
	#hasPendingChange = false
	#pendingPairs = new Map<AnyComponentToken, Set<Entity>>()

	create(): Entity {
		return this.#mutate(() => {
			const entity = this.#nextEntity as Entity
			this.#nextEntity += 1
			this.#entities.add(entity)
			this.#recordChange()
			return entity
		})
	}

	destroy(entity: Entity): void {
		this.#mutate(() => {
			this.#assertEntity(entity)

			for (const [component, store] of this.#stores) {
				if (store.delete(entity)) {
					this.#recordChange(component, entity)
				}
			}

			this.#entities.delete(entity)
			this.#recordChange()
		})
	}

	exists(entity: Entity): boolean {
		return this.#entities.has(entity)
	}

	get<Token extends AnyComponentToken>(
		entity: Entity,
		component: Token,
	): ComponentData<Token> | undefined {
		this.#assertEntity(entity)
		return this.#stores.get(component)?.get(entity) as
			| ComponentData<Token>
			| undefined
	}

	has(entity: Entity, component: AnyComponentToken): boolean {
		this.#assertEntity(entity)
		return this.#stores.get(component)?.has(entity) ?? false
	}

	set<Token extends AnyComponentToken>(
		entity: Entity,
		component: Token,
		value: ComponentInput<Token>,
	): void {
		this.#mutate(() => {
			this.#assertEntity(entity)

			if (value === undefined) {
				throw new Error(`Component "${component.name}" cannot store undefined`)
			}

			let store = this.#stores.get(component)
			if (store === undefined) {
				store = new Map()
				this.#stores.set(component, store)
			}

			const previous = store.get(entity)
			if (store.has(entity) && Object.is(previous, value)) {
				return
			}

			store.set(entity, value)
			this.#recordChange(component, entity)
		})
	}

	update<Token extends AnyComponentToken>(
		entity: Entity,
		component: Token,
		updater: (current: ComponentData<Token>) => ComponentInput<Token>,
	): void {
		this.#mutate(() => {
			this.#assertEntity(entity)
			const current = this.#stores.get(component)?.get(entity)

			if (current === undefined) {
				throw new Error(
					`Entity ${entity} does not have component "${component.name}"`,
				)
			}

			this.set(entity, component, updater(current as ComponentData<Token>))
		})
	}

	remove(entity: Entity, component: AnyComponentToken): boolean {
		return this.#mutate(() => {
			this.#assertEntity(entity)
			const removed = this.#stores.get(component)?.delete(entity) ?? false

			if (removed) {
				this.#recordChange(component, entity)
			}

			return removed
		})
	}

	query<
		const Tokens extends readonly [AnyComponentToken, ...AnyComponentToken[]],
	>(...components: Tokens): QueryResult<Tokens> {
		if (components.length === 0) {
			throw new Error("A query requires at least one component")
		}

		const stores = components.map(component => this.#stores.get(component))
		if (stores.some(store => store === undefined)) {
			return [] as QueryResult<Tokens>
		}

		const presentStores = stores as Array<Map<Entity, unknown>>
		let smallestStore = presentStores[0] as Map<Entity, unknown>
		for (const store of presentStores.slice(1)) {
			if (store.size < smallestStore.size) {
				smallestStore = store
			}
		}

		const entities = Array.from(smallestStore.keys())
			.filter(entity => presentStores.every(store => store.has(entity)))
			.sort((left, right) => left - right)

		return entities.map(entity => [
			entity,
			...presentStores.map(store => store.get(entity)),
		]) as QueryResult<Tokens>
	}

	run<Output>(system: System<void, Output>): Output
	run<Input, Output>(system: System<Input, Output>, input: Input): Output
	run<Input, Output>(system: System<Input, Output>, input?: Input): Output {
		this.#batchDepth += 1
		let result: Output | undefined
		let systemError: unknown
		let didSystemThrow = false

		try {
			result = system(this, input as Input)
		} catch (error) {
			didSystemThrow = true
			systemError = error
		} finally {
			this.#batchDepth -= 1
		}

		let notificationError: unknown
		let didNotificationThrow = false
		if (this.#batchDepth === 0) {
			try {
				this.#flush()
			} catch (error) {
				didNotificationThrow = true
				notificationError = error
			}
		}

		if (didSystemThrow) {
			throw systemError
		}
		if (didNotificationThrow) {
			throw notificationError
		}

		return result as Output
	}

	subscribe(listener: () => void, scope?: SubscriptionScope): () => void {
		if (scope === undefined) {
			this.#globalListeners.add(listener)
			return () => {
				this.#globalListeners.delete(listener)
			}
		}

		if ("components" in scope) {
			for (const component of scope.components) {
				let listeners = this.#componentListeners.get(component)
				if (listeners === undefined) {
					listeners = new Set()
					this.#componentListeners.set(component, listeners)
				}
				listeners.add(listener)
			}

			return () => {
				for (const component of scope.components) {
					const listeners = this.#componentListeners.get(component)
					listeners?.delete(listener)
					if (listeners?.size === 0) {
						this.#componentListeners.delete(component)
					}
				}
			}
		}

		let byEntity = this.#exactListeners.get(scope.component)
		if (byEntity === undefined) {
			byEntity = new Map()
			this.#exactListeners.set(scope.component, byEntity)
		}

		let listeners = byEntity.get(scope.entity)
		if (listeners === undefined) {
			listeners = new Set()
			byEntity.set(scope.entity, listeners)
		}
		listeners.add(listener)

		return () => {
			const currentByEntity = this.#exactListeners.get(scope.component)
			const currentListeners = currentByEntity?.get(scope.entity)
			currentListeners?.delete(listener)

			if (currentListeners?.size === 0) {
				currentByEntity?.delete(scope.entity)
			}
			if (currentByEntity?.size === 0) {
				this.#exactListeners.delete(scope.component)
			}
		}
	}

	getVersion(scope?: SubscriptionScope): number {
		if (scope === undefined) {
			return this.#version
		}

		if ("components" in scope) {
			return Math.max(
				0,
				...scope.components.map(
					component => this.#componentVersions.get(component) ?? 0,
				),
			)
		}

		return this.#exactVersions.get(scope.component)?.get(scope.entity) ?? 0
	}

	#mutate<Output>(operation: () => Output): Output {
		if (this.#notifying) {
			throw new Error("World cannot be changed from a subscriber")
		}

		const opensBatch = this.#batchDepth === 0
		if (opensBatch) {
			this.#batchDepth += 1
		}

		let result: Output | undefined
		let operationError: unknown
		let didOperationThrow = false
		try {
			result = operation()
		} catch (error) {
			didOperationThrow = true
			operationError = error
		} finally {
			if (opensBatch) {
				this.#batchDepth -= 1
			}
		}

		let notificationError: unknown
		let didNotificationThrow = false
		if (opensBatch) {
			try {
				this.#flush()
			} catch (error) {
				didNotificationThrow = true
				notificationError = error
			}
		}

		if (didOperationThrow) {
			throw operationError
		}
		if (didNotificationThrow) {
			throw notificationError
		}

		return result as Output
	}

	#assertEntity(entity: Entity): void {
		if (!this.#entities.has(entity)) {
			throw new Error(`Entity ${entity} does not exist`)
		}
	}

	#recordChange(component?: AnyComponentToken, entity?: Entity): void {
		this.#hasPendingChange = true

		if (component === undefined || entity === undefined) {
			return
		}

		let entities = this.#pendingPairs.get(component)
		if (entities === undefined) {
			entities = new Set()
			this.#pendingPairs.set(component, entities)
		}
		entities.add(entity)
	}

	#flush(): void {
		if (!this.#hasPendingChange) {
			return
		}

		this.#version += 1
		const version = this.#version
		const changedPairs = this.#pendingPairs
		this.#pendingPairs = new Map()
		this.#hasPendingChange = false

		const listeners = new Set(this.#globalListeners)

		for (const [component, entities] of changedPairs) {
			this.#componentVersions.set(component, version)

			for (const listener of this.#componentListeners.get(component) ?? []) {
				listeners.add(listener)
			}

			let versionsByEntity = this.#exactVersions.get(component)
			if (versionsByEntity === undefined) {
				versionsByEntity = new Map()
				this.#exactVersions.set(component, versionsByEntity)
			}

			const listenersByEntity = this.#exactListeners.get(component)
			for (const entity of entities) {
				versionsByEntity.set(entity, version)
				for (const listener of listenersByEntity?.get(entity) ?? []) {
					listeners.add(listener)
				}
			}
		}

		this.#notifying = true
		let firstError: unknown
		let didListenerThrow = false

		try {
			for (const listener of listeners) {
				try {
					listener()
				} catch (error) {
					if (!didListenerThrow) {
						didListenerThrow = true
						firstError = error
					}
				}
			}
		} finally {
			this.#notifying = false
		}

		if (didListenerThrow) {
			throw firstError
		}
	}
}

export function createWorld(): World {
	return new WorldState()
}
