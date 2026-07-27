import {
	createWorld,
	defineComponent,
	defineQuery,
	type Entity,
	optional,
	type System,
	without,
} from "ecsplain"

const Position = defineComponent<{ x: number; y: number }>("Position")
const Label = defineComponent<string>("Label")
const Hidden = defineComponent<true>("Hidden")
const world = createWorld()
const entity: Entity = world.spawn(
	[Position, { x: 1, y: 2 }],
	[Label, "origin"],
)

const visiblePositions = defineQuery(Position, optional(Label), without(Hidden))

const rows = world.query(visiblePositions)
const position: Readonly<{ x: number; y: number }> = rows[0]?.[1] ?? {
	x: 0,
	y: 0,
}
const label: string | undefined = rows[0]?.[2]
const requiredPosition: Readonly<{ x: number; y: number }> = world.require(
	entity,
	Position,
)
const singlePosition: Readonly<{ x: number; y: number }> =
	world.single(Position)[1]
const labels = world.index(Label)
const labelEntities: readonly Entity[] = labels.get("origin")
const uniqueLabels = world.index(Label, { unique: true })
const labeledEntity: Entity | undefined = uniqueLabels.get("origin")

void position
void label
void requiredPosition
void singlePosition
void labelEntities
void labeledEntity

const move: System<{ entity: Entity; x: number }> = (currentWorld, input) => {
	currentWorld.update(input.entity, Position, current => ({
		...current,
		x: input.x,
	}))
}

world.run(move, { entity, x: 4 })

// @ts-expect-error A query must request at least one component.
world.query()

// @ts-expect-error A query must start with a required component.
world.query(optional(Label))

// @ts-expect-error Position requires both numeric fields.
world.set(entity, Position, { x: "wrong" })

// @ts-expect-error Spawn entries preserve the component value type.
world.spawn([Position, { x: "wrong", y: 2 }])

// @ts-expect-error Use create when spawning an entity without components.
world.spawn()

const current = world.get(entity, Position)
if (current !== undefined) {
	// @ts-expect-error Component reads are readonly.
	current.x = 3
}
