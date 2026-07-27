// @vitest-environment jsdom

import { act, render, screen } from "@testing-library/react"
import {
	createWorld,
	defineComponent,
	defineQuery,
	optional,
	without,
} from "ecsplain"
import {
	useComponent,
	useComponentSelector,
	useQuery,
	useQuerySelector,
	WorldProvider,
} from "ecsplain/react"
import { describe, expect, it } from "vitest"

const Person = defineComponent<{ name: string; role: string }>("Person")
const Selected = defineComponent<true>("Selected")
const Archived = defineComponent<true>("Archived")
const ActivePeople = defineQuery(Person, optional(Selected), without(Archived))
const People = defineQuery(Person)

describe("React bindings", () => {
	it("updates a query only for its component scope", () => {
		const world = createWorld()
		const entity = world.create()
		world.set(entity, Person, { name: "Ada", role: "Admin" })
		let renders = 0

		function People() {
			renders += 1
			const people = useQuery(Person)
			return <output>{people[0]?.[1].name}</output>
		}

		render(
			<WorldProvider world={world}>
				<People />
			</WorldProvider>,
		)

		expect(renders).toBe(1)

		act(() => world.set(entity, Selected, true))
		expect(renders).toBe(1)

		act(() => world.set(entity, Person, { name: "Grace", role: "Admin" }))
		expect(renders).toBe(2)
		expect(screen.getByText("Grace")).toBeTruthy()
	})

	it("tracks optional and excluded dependencies from a query definition", () => {
		const world = createWorld()
		const entity = world.spawn([Person, { name: "Ada", role: "Admin" }])

		function Summary() {
			const people = useQuery(ActivePeople)
			return (
				<output>
					{people.length}:{String(people[0]?.[2] ?? false)}
				</output>
			)
		}

		render(
			<WorldProvider world={world}>
				<Summary />
			</WorldProvider>,
		)

		expect(screen.getByText("1:false")).toBeTruthy()

		act(() => world.set(entity, Selected, true))
		expect(screen.getByText("1:true")).toBeTruthy()

		act(() => world.set(entity, Archived, true))
		expect(screen.getByText("0:false")).toBeTruthy()
	})

	it("isolates exact entity-component subscriptions", () => {
		const world = createWorld()
		const first = world.create()
		const second = world.create()
		world.set(first, Selected, true)
		world.set(second, Selected, true)
		let firstRenders = 0
		let secondRenders = 0

		function Selection({
			entity,
			onRender,
		}: {
			entity: typeof first
			onRender: () => void
		}) {
			onRender()
			const selected = useComponent(entity, Selected)
			return <output>{String(selected ?? false)}</output>
		}

		render(
			<WorldProvider world={world}>
				<Selection
					entity={first}
					onRender={() => {
						firstRenders += 1
					}}
				/>
				<Selection
					entity={second}
					onRender={() => {
						secondRenders += 1
					}}
				/>
			</WorldProvider>,
		)

		act(() => world.remove(first, Selected))

		expect(firstRenders).toBe(2)
		expect(secondRenders).toBe(1)
	})

	it("bails out selectors whose selected value did not change", () => {
		const world = createWorld()
		const entity = world.create()
		world.set(entity, Person, { name: "Ada", role: "Admin" })
		let nameRenders = 0
		let roleRenders = 0

		function Name() {
			nameRenders += 1
			return (
				<output>
					{useComponentSelector(entity, Person, person => person.name)}
				</output>
			)
		}

		function Role() {
			roleRenders += 1
			return (
				<output>
					{useComponentSelector(entity, Person, person => person.role)}
				</output>
			)
		}

		render(
			<WorldProvider world={world}>
				<Name />
				<Role />
			</WorldProvider>,
		)

		act(() => world.set(entity, Person, { name: "Grace", role: "Admin" }))

		expect(nameRenders).toBe(2)
		expect(roleRenders).toBe(1)
	})

	it("does not render query selectors when their selected value is unchanged", () => {
		const world = createWorld()
		const entity = world.spawn([Person, { name: "Ada", role: "Admin" }])
		let renders = 0

		function Count() {
			renders += 1
			const count = useQuerySelector(People, people => people.length)
			return <output>{count}</output>
		}

		render(
			<WorldProvider world={world}>
				<Count />
			</WorldProvider>,
		)

		expect(renders).toBe(1)

		act(() => world.set(entity, Person, { name: "Ada", role: "Editor" }))
		expect(renders).toBe(1)

		act(() => world.spawn([Person, { name: "Grace", role: "Admin" }]))
		expect(renders).toBe(2)
		expect(screen.getByText("2")).toBeTruthy()
	})

	it("supports custom query selection equality", () => {
		const world = createWorld()
		const entity = world.spawn([Person, { name: "Ada", role: "Admin" }])
		let renders = 0

		function Names() {
			renders += 1
			const names = useQuerySelector(
				People,
				people => people.map(([, person]) => person.name),
				(left, right) =>
					left.length === right.length &&
					left.every((name, index) => name === right[index]),
			)
			return <output>{names.join(", ")}</output>
		}

		const rendered = render(
			<WorldProvider world={world}>
				<Names />
			</WorldProvider>,
		)

		act(() => world.set(entity, Person, { name: "Ada", role: "Editor" }))
		expect(renders).toBe(1)

		act(() => world.set(entity, Person, { name: "Grace", role: "Editor" }))
		expect(renders).toBe(2)
		expect(rendered.container.textContent).toBe("Grace")
	})

	it("returns undefined safely when a subscribed entity is destroyed", () => {
		const world = createWorld()
		const entity = world.create()
		world.set(entity, Person, { name: "Ada", role: "Admin" })

		function PersonName() {
			const person = useComponent(entity, Person)
			return <output>{person?.name ?? "missing"}</output>
		}

		render(
			<WorldProvider world={world}>
				<PersonName />
			</WorldProvider>,
		)

		act(() => world.destroy(entity))

		expect(screen.getByText("missing")).toBeTruthy()
	})
})
