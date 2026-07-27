import { useSyncExternalStore } from "react"
import type { AnyComponentToken, ComponentData } from "../component"
import type { Entity, QueryResult, SubscriptionScope } from "../world"
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

export function useQuery<
	const Tokens extends readonly [AnyComponentToken, ...AnyComponentToken[]],
>(...components: Tokens): QueryResult<Tokens> {
	const world = useWorld()
	const scope = { components } satisfies SubscriptionScope
	const readVersion = () => world.getVersion(scope)

	useSyncExternalStore(
		listener => world.subscribe(listener, scope),
		readVersion,
		readVersion,
	)

	return world.query(...components)
}
