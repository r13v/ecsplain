import {
	createWorld,
	defineComponent,
	type Entity,
	type System,
} from "ecsplain"

const Position = defineComponent<{ x: number; y: number }>("Position")
const Label = defineComponent<string>("Label")
const world = createWorld()
const entity: Entity = world.create()

world.set(entity, Position, { x: 1, y: 2 })
world.set(entity, Label, "origin")

const rows = world.query(Position, Label)
const position: Readonly<{ x: number; y: number }> = rows[0]?.[1] ?? {
	x: 0,
	y: 0,
}
const label: string = rows[0]?.[2] ?? ""

void position
void label

const move: System<{ entity: Entity; x: number }> = (currentWorld, input) => {
	currentWorld.update(input.entity, Position, current => ({
		...current,
		x: input.x,
	}))
}

world.run(move, { entity, x: 4 })

// @ts-expect-error A query must request at least one component.
world.query()

// @ts-expect-error Position requires both numeric fields.
world.set(entity, Position, { x: "wrong" })

const current = world.get(entity, Position)
if (current !== undefined) {
	// @ts-expect-error Component reads are readonly.
	current.x = 3
}
