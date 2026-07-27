import { useMemo, useRef, useSyncExternalStore } from "react"
import type { AnyComponentToken, ComponentData } from "../component"
import {
	type AnyQueryResult,
	type QueryDefinition,
	type QueryResult,
	type QueryTerms,
	queryComponents,
	resolveQueryTerms,
} from "../query"
import type { Entity, SubscriptionScope } from "../world"
import { useWorld } from "./context"

function readComponent<Token extends AnyComponentToken>(
	world: ReturnType<typeof useWorld>,
	entity: Entity,
	component: Token,
): ComponentData<Token> | undefined {
	if (!world.exists(entity)) {
		return undefined
	}

	return world.get(entity, component)
}

export function useComponent<Token extends AnyComponentToken>(
	entity: Entity,
	component: Token,
): ComponentData<Token> | undefined {
	const world = useWorld()
	const scope = { entity, component } satisfies SubscriptionScope
	const read = () => readComponent(world, entity, component)

	return useSyncExternalStore(
		listener => world.subscribe(listener, scope),
		read,
		read,
	)
}

export function useComponentSelector<Token extends AnyComponentToken, Selected>(
	entity: Entity,
	component: Token,
	selector: (value: ComponentData<Token>) => Selected,
): Selected | undefined {
	const world = useWorld()
	const scope = { entity, component } satisfies SubscriptionScope
	const read = () => {
		const value = readComponent(world, entity, component)
		return value === undefined ? undefined : selector(value)
	}

	return useSyncExternalStore(
		listener => world.subscribe(listener, scope),
		read,
		read,
	)
}

export function useQuery<const Terms extends QueryTerms>(
	...terms: Terms
): QueryResult<Terms>
export function useQuery<const Terms extends QueryTerms>(
	definition: QueryDefinition<Terms>,
): QueryResult<Terms>
export function useQuery(...input: readonly unknown[]): AnyQueryResult {
	const world = useWorld()
	const terms = resolveQueryTerms(input)
	const scope = {
		components: queryComponents(terms),
	} satisfies SubscriptionScope
	const readVersion = () => world.getVersion(scope)

	useSyncExternalStore(
		listener => world.subscribe(listener, scope),
		readVersion,
		readVersion,
	)

	return world.query(...terms)
}

export function useQuerySelector<const Terms extends QueryTerms, Selected>(
	definition: QueryDefinition<Terms>,
	selector: (rows: QueryResult<Terms>) => Selected,
	isEqual: (left: Selected, right: Selected) => boolean = Object.is,
): Selected {
	const world = useWorld()
	const selectorRef = useRef(selector)
	const equalityRef = useRef(isEqual)
	selectorRef.current = selector
	equalityRef.current = isEqual

	const externalStore = useMemo(() => {
		const scope = {
			components: queryComponents(definition.terms),
		} satisfies SubscriptionScope
		let hasSelection = false
		let version = -1
		let selectedBy: typeof selector | undefined
		let comparedBy: typeof isEqual | undefined
		let selection: Selected

		const read = (): Selected => {
			const nextVersion = world.getVersion(scope)
			const currentSelector = selectorRef.current
			const currentEquality = equalityRef.current

			if (
				!hasSelection ||
				version !== nextVersion ||
				selectedBy !== currentSelector ||
				comparedBy !== currentEquality
			) {
				const nextSelection = currentSelector(world.query(definition))
				if (!hasSelection || !currentEquality(selection, nextSelection)) {
					selection = nextSelection
				}

				hasSelection = true
				version = nextVersion
				selectedBy = currentSelector
				comparedBy = currentEquality
			}

			return selection
		}

		return {
			read,
			subscribe: (listener: () => void) => world.subscribe(listener, scope),
		}
	}, [definition, world])

	return useSyncExternalStore(
		externalStore.subscribe,
		externalStore.read,
		externalStore.read,
	)
}
