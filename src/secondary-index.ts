import type { AnyComponentToken } from "./component"
import type { Entity } from "./world"

export interface SecondaryIndex<Key> {
	has(key: Key): boolean
	get(key: Key): readonly Entity[]
}

export interface UniqueSecondaryIndex<Key> {
	has(key: Key): boolean
	get(key: Key): Entity | undefined
}

export interface MutableIndexState {
	assertCanSet(entity: Entity | undefined, key: unknown): void
	set(entity: Entity, key: unknown): void
	delete(entity: Entity): void
}

export class SecondaryIndexState<Key>
	implements SecondaryIndex<Key>, MutableIndexState
{
	readonly #byKey = new Map<Key, Set<Entity>>()
	readonly #keyByEntity = new Map<Entity, Key>()

	has(key: Key): boolean {
		return this.#byKey.has(key)
	}

	get(key: Key): readonly Entity[] {
		return Array.from(this.#byKey.get(key) ?? []).sort(
			(left, right) => left - right,
		)
	}

	assertCanSet(): void {}

	set(entity: Entity, key: unknown): void {
		const typedKey = key as Key
		if (
			this.#keyByEntity.has(entity) &&
			Object.is(this.#keyByEntity.get(entity), typedKey)
		) {
			return
		}

		this.delete(entity)

		let entities = this.#byKey.get(typedKey)
		if (entities === undefined) {
			entities = new Set()
			this.#byKey.set(typedKey, entities)
		}
		entities.add(entity)
		this.#keyByEntity.set(entity, typedKey)
	}

	delete(entity: Entity): void {
		if (!this.#keyByEntity.has(entity)) {
			return
		}

		const key = this.#keyByEntity.get(entity) as Key
		const entities = this.#byKey.get(key)
		entities?.delete(entity)
		if (entities?.size === 0) {
			this.#byKey.delete(key)
		}
		this.#keyByEntity.delete(entity)
	}
}

export class UniqueSecondaryIndexState<Key>
	implements UniqueSecondaryIndex<Key>, MutableIndexState
{
	readonly #byKey = new Map<Key, Entity>()
	readonly #keyByEntity = new Map<Entity, Key>()

	constructor(readonly component: AnyComponentToken) {}

	has(key: Key): boolean {
		return this.#byKey.has(key)
	}

	get(key: Key): Entity | undefined {
		return this.#byKey.get(key)
	}

	assertCanSet(entity: Entity | undefined, key: unknown): void {
		const existing = this.#byKey.get(key as Key)
		if (existing !== undefined && existing !== entity) {
			throw new Error(
				`Component "${this.component.name}" already indexes value for entity ${existing}`,
			)
		}
	}

	set(entity: Entity, key: unknown): void {
		const typedKey = key as Key
		this.assertCanSet(entity, typedKey)

		if (
			this.#keyByEntity.has(entity) &&
			Object.is(this.#keyByEntity.get(entity), typedKey)
		) {
			return
		}

		this.delete(entity)
		this.#byKey.set(typedKey, entity)
		this.#keyByEntity.set(entity, typedKey)
	}

	delete(entity: Entity): void {
		if (!this.#keyByEntity.has(entity)) {
			return
		}

		const key = this.#keyByEntity.get(entity) as Key
		if (this.#byKey.get(key) === entity) {
			this.#byKey.delete(key)
		}
		this.#keyByEntity.delete(entity)
	}
}
