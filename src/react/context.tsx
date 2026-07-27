import { createContext, type PropsWithChildren, useContext } from "react"
import type { World } from "../world"

const WorldContext = createContext<World | undefined>(undefined)

export function WorldProvider({
	children,
	world,
}: PropsWithChildren<{ world: World }>) {
	return <WorldContext.Provider value={world}>{children}</WorldContext.Provider>
}

export function useWorld(): World {
	const world = useContext(WorldContext)

	if (world === undefined) {
		throw new Error("useWorld must be used inside WorldProvider")
	}

	return world
}
