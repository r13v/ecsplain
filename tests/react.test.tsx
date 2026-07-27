// @vitest-environment jsdom

import { act, render, screen } from "@testing-library/react"
import { createWorld, defineComponent } from "ecsplain"
import {
	useComponent,
	useComponentSelector,
	useQuery,
	WorldProvider,
} from "ecsplain/react"
import { describe, expect, it } from "vitest"

const Person = defineComponent<{ name: string; role: string }>("Person")
const Selected = defineComponent<true>("Selected")

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
