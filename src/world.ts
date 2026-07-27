import type {
	AnyComponentToken,
	ComponentData,
	ComponentInput,
} from "./component"
import {
	type AnyQueryItem,
	type AnyQueryResult,
	isOptionalTerm,
	isWithoutTerm,
	type QueryDefinition,
	type QueryItem,
	type QueryResult,
	type QueryTerms,
	resolveQueryTerms,
} from "./query"
import {
	type MutableIndexState,
	type SecondaryIndex,
	SecondaryIndexState,
	type UniqueSecondaryIndex,
	UniqueSecondaryIndexState,
} from "./secondary-index"

declare const entityBrand: unique symbol

export type Entity = number & { readonly [entityBrand]: true }

export type System<Input = void, Output = void> = (
	world: World,
	input: Input,
) => Output

export type ComponentEntry<Token extends AnyComponentToken> = readonly [
	component: Token,
	value: ComponentInput<Token>,
]

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
	spawn<
		const Tokens extends readonly [AnyComponentToken, ...AnyComponentToken[]],
	>(
		...components: {
			-readonly [Index in keyof Tokens]: ComponentEntry<Tokens[Index]>
		}
	): Entity
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
	require<Token extends AnyComponentToken>(
		entity: Entity,
		component: Token,
	): ComponentData<Token>
	query<const Terms extends QueryTerms>(...terms: Terms): QueryResult<Terms>
	query<const Terms extends QueryTerms>(
		definition: QueryDefinition<Terms>,
	): QueryResult<Terms>
	single<const Terms extends QueryTerms>(...terms: Terms): QueryItem<Terms>
	single<const Terms extends QueryTerms>(
		definition: QueryDefinition<Terms>,
	): QueryItem<Terms>
	index<Token extends AnyComponentToken>(
		component: Token,
	): SecondaryIndex<ComponentData<Token>>
	index<Token extends AnyComponentToken>(
		component: Token,
		options: { readonly unique: true },
	): UniqueSecondaryIndex<ComponentData<Token>>
	run<Output>(system: System<void, Output>): Output
	run<Input, Output>(system: System<Input, Output>, input: Input): Output
	subscribe(listener: () => void, scope?: SubscriptionScope): () => void
	getVersion(scope?: SubscriptionScope): number
}

interface ComponentIndexes {
	many: SecondaryIndexState<unknown> | undefined
	unique: UniqueSecondaryIndexState<unknown> | undefined
}

class WorldState implements World {
	readonly #entities = new Set<Entity>()
	readonly #stores = new Map<AnyComponentToken, Map<Entity, unknown>>()
	readonly #indexes = new Map<AnyComponentToken, ComponentIndexes>()
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

	spawn<
		const Tokens extends readonly [AnyComponentToken, ...AnyComponentToken[]],
	>(
		...components: {
			-readonly [Index in keyof Tokens]: ComponentEntry<Tokens[Index]>
		}
	): Entity {
		if (components.length === 0) {
			throw new Error("Spawn requires at least one component")
		}

		for (const [component, value] of components) {
			this.#assertComponentValue(component, value)
			this.#assertIndexesCanSet(component, undefined, value)
		}

		return this.#mutate(() => {
			const entity = this.create()
			for (const [component, value] of components) {
				this.set(entity, component, value)
			}
			return entity
		})
	}

	destroy(entity: Entity): void {
		this.#mutate(() => {
			this.#assertEntity(entity)

			for (const [component, store] of this.#stores) {
				if (store.delete(entity)) {
					this.#deleteFromIndexes(component, entity)
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

	require<Token extends AnyComponentToken>(
		entity: Entity,
		component: Token,
	): ComponentData<Token> {
		const value = this.get(entity, component)
		if (value === undefined) {
			throw new Error(
				`Entity ${entity} does not have component "${component.name}"`,
			)
		}
		return value
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
			this.#assertComponentValue(component, value)

			let store = this.#stores.get(component)
			if (store === undefined) {
				store = new Map()
				this.#stores.set(component, store)
			}

			const previous = store.get(entity)
			if (store.has(entity) && Object.is(previous, value)) {
				return
			}

			this.#assertIndexesCanSet(component, entity, value)
			store.set(entity, value)
			this.#setIndexes(component, entity, value)
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
				this.#deleteFromIndexes(component, entity)
				this.#recordChange(component, entity)
			}

			return removed
		})
	}

	query<const Terms extends QueryTerms>(...terms: Terms): QueryResult<Terms>
	query<const Terms extends QueryTerms>(
		definition: QueryDefinition<Terms>,
	): QueryResult<Terms>
	query(...input: readonly unknown[]): AnyQueryResult {
		return this.#query(resolveQueryTerms(input))
	}

	single<const Terms extends QueryTerms>(...terms: Terms): QueryItem<Terms>
	single<const Terms extends QueryTerms>(
		definition: QueryDefinition<Terms>,
	): QueryItem<Terms>
	single(...input: readonly unknown[]): AnyQueryItem {
		const terms = resolveQueryTerms(input)
		const result = this.#query(terms)

		if (result.length !== 1) {
			throw new Error(
				`Expected exactly one entity matching query, found ${result.length}`,
			)
		}

		return result[0] as QueryItem<QueryTerms>
	}

	index<Token extends AnyComponentToken>(
		component: Token,
	): SecondaryIndex<ComponentData<Token>>
	index<Token extends AnyComponentToken>(
		component: Token,
		options: { readonly unique: true },
	): UniqueSecondaryIndex<ComponentData<Token>>
	index<Token extends AnyComponentToken>(
		component: Token,
		options?: { readonly unique: true },
	):
		| SecondaryIndex<ComponentData<Token>>
		| UniqueSecondaryIndex<ComponentData<Token>> {
		const current = this.#indexes.get(component) ?? {
			many: undefined,
			unique: undefined,
		}

		if (options?.unique === true) {
			if (current.unique !== undefined) {
				return current.unique as UniqueSecondaryIndex<ComponentData<Token>>
			}

			const index = new UniqueSecondaryIndexState<unknown>(component)
			for (const [entity, value] of this.#stores.get(component) ?? []) {
				index.set(entity, value)
			}
			current.unique = index
			this.#indexes.set(component, current)
			return index as UniqueSecondaryIndex<ComponentData<Token>>
		}

		if (current.many !== undefined) {
			return current.many as SecondaryIndex<ComponentData<Token>>
		}

		const index = new SecondaryIndexState<unknown>()
		for (const [entity, value] of this.#stores.get(component) ?? []) {
			index.set(entity, value)
		}
		current.many = index
		this.#indexes.set(component, current)
		return index as SecondaryIndex<ComponentData<Token>>
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

	#query(terms: QueryTerms): QueryResult<QueryTerms> {
		const requiredComponents: AnyComponentToken[] = []
		const excludedComponents: AnyComponentToken[] = []

		for (const term of terms) {
			if (isOptionalTerm(term)) {
				continue
			}
			if (isWithoutTerm(term)) {
				excludedComponents.push(term.component)
			} else {
				requiredComponents.push(term)
			}
		}

		const requiredStores = requiredComponents.map(component =>
			this.#stores.get(component),
		)
		if (requiredStores.some(store => store === undefined)) {
			return []
		}

		const presentStores = requiredStores as Array<Map<Entity, unknown>>
		let smallestStore = presentStores[0] as Map<Entity, unknown>
		for (const store of presentStores.slice(1)) {
			if (store.size < smallestStore.size) {
				smallestStore = store
			}
		}

		const excludedStores = excludedComponents.map(component =>
			this.#stores.get(component),
		)
		const entities = Array.from(smallestStore.keys())
			.filter(
				entity =>
					presentStores.every(store => store.has(entity)) &&
					excludedStores.every(store => !store?.has(entity)),
			)
			.sort((left, right) => left - right)

		return entities.map(entity => {
			const values: unknown[] = []
			for (const term of terms) {
				if (isWithoutTerm(term)) {
					continue
				}
				const component = isOptionalTerm(term) ? term.component : term
				values.push(this.#stores.get(component)?.get(entity))
			}
			return [entity, ...values] as QueryItem<QueryTerms>
		})
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

	#assertComponentValue(component: AnyComponentToken, value: unknown): void {
		if (value === undefined) {
			throw new Error(`Component "${component.name}" cannot store undefined`)
		}
	}

	#assertIndexesCanSet(
		component: AnyComponentToken,
		entity: Entity | undefined,
		value: unknown,
	): void {
		for (const index of this.#indexStates(component)) {
			index.assertCanSet(entity, value)
		}
	}

	#setIndexes(
		component: AnyComponentToken,
		entity: Entity,
		value: unknown,
	): void {
		for (const index of this.#indexStates(component)) {
			index.set(entity, value)
		}
	}

	#deleteFromIndexes(component: AnyComponentToken, entity: Entity): void {
		for (const index of this.#indexStates(component)) {
			index.delete(entity)
		}
	}

	#indexStates(component: AnyComponentToken): MutableIndexState[] {
		const indexes = this.#indexes.get(component)
		if (indexes === undefined) {
			return []
		}

		const states: MutableIndexState[] = []
		if (indexes.many !== undefined) {
			states.push(indexes.many)
		}
		if (indexes.unique !== undefined) {
			states.push(indexes.unique)
		}
		return states
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
