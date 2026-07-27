import {
	createWorld,
	defineComponent,
	defineQuery,
	type Entity,
	optional,
	type System,
	type SystemExecution,
	type SystemMiddleware,
	type WorldOptions,
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

const traceMiddleware: SystemMiddleware = <Input, Output>(
	execution: SystemExecution<Input, Output>,
	next: () => Output,
): Output => {
	const system: System<Input, Output> = execution.system
	const input: Input = execution.input
	const depth: number = execution.depth

	void system
	void input
	void depth

	return next()
}

const worldOptions: WorldOptions = { middleware: [traceMiddleware] }
const observedWorld = createWorld(worldOptions)
observedWorld.run(move, { entity, x: 5 })

// @ts-expect-error Middleware must be synchronous.
const asyncMiddleware: SystemMiddleware = async (_execution, next) => next()

// @ts-expect-error Middleware must return the value from next().
const replacementMiddleware: SystemMiddleware = () => "replacement"

void asyncMiddleware
void replacementMiddleware

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
