import { describe, expect, it } from "vitest"
import { createFormExample } from "../examples/dynamic-form/src/bootstrap"
import {
	ActiveField,
	DeliveryBranch,
	FieldError,
	type FieldName,
	FieldValue,
	FormField,
	FormSubmission,
} from "../examples/dynamic-form/src/model"
import {
	changeFieldValue,
	submitDeliveryForm,
} from "../examples/dynamic-form/src/systems"

function fieldsByName(example: ReturnType<typeof createFormExample>) {
	return new Map(
		example.world
			.query(FormField)
			.map(([field, definition]) => [definition.name, field] as const),
	)
}

function activeNames(example: ReturnType<typeof createFormExample>) {
	return example.world
		.query(FormField, ActiveField)
		.map(([, definition]) => definition.name)
}

describe("dynamic delivery form", () => {
	it("changes query structure while preserving inactive values", () => {
		const example = createFormExample()
		const fields = fieldsByName(example)
		const method = fields.get("deliveryMethod")
		const city = fields.get("city")
		if (method === undefined || city === undefined) {
			throw new Error("Expected delivery fields")
		}

		expect(activeNames(example)).toEqual([
			"fullName",
			"deliveryMethod",
			"city",
			"address",
		])

		example.world.run(changeFieldValue, {
			form: example.form,
			field: city,
			value: "London",
		})
		example.world.run(changeFieldValue, {
			form: example.form,
			field: method,
			value: "pickup",
		})

		expect(activeNames(example)).toEqual([
			"fullName",
			"deliveryMethod",
			"pickupPoint",
		])
		expect(example.world.get(city, FieldValue)?.value).toBe("London")

		example.world.run(changeFieldValue, {
			form: example.form,
			field: method,
			value: "courier",
		})

		expect(example.world.has(city, ActiveField)).toBe(true)
		expect(example.world.get(city, FieldValue)?.value).toBe("London")
	})

	it("validates and submits active fields only", () => {
		const example = createFormExample()
		const fields = fieldsByName(example)
		const values: Partial<Record<FieldName, string>> = {
			fullName: "Ada Lovelace",
			deliveryMethod: "pickup",
			pickupPoint: "central",
		}

		for (const [name, value] of Object.entries(values)) {
			const field = fields.get(name as FieldName)
			if (field === undefined || value === undefined) {
				throw new Error(`Expected field ${name}`)
			}
			example.world.run(changeFieldValue, {
				form: example.form,
				field,
				value,
			})
		}

		const submitted = example.world.run(submitDeliveryForm, {
			form: example.form,
		})

		expect(submitted).toBe(true)
		expect(example.world.get(example.form, FormSubmission)?.values).toEqual({
			fullName: "Ada Lovelace",
			deliveryMethod: "pickup",
			pickupPoint: "central",
		})
		expect(example.world.query(FieldError)).toEqual([])
	})

	it("stores field errors in ECS and clears stale feedback on change", () => {
		const example = createFormExample()
		const fields = fieldsByName(example)
		const fullName = fields.get("fullName")
		if (fullName === undefined) {
			throw new Error("Expected full name field")
		}

		expect(example.world.run(submitDeliveryForm, { form: example.form })).toBe(
			false,
		)
		expect(example.world.query(FieldError).length).toBeGreaterThan(0)

		example.world.run(changeFieldValue, {
			form: example.form,
			field: fullName,
			value: "Grace Hopper",
		})

		expect(example.world.query(FieldError)).toEqual([])
		expect(example.world.get(example.form, FormSubmission)).toBeUndefined()
	})

	it("models conditional ownership with branch components", () => {
		const example = createFormExample()
		const branches = example.world.query(FormField, DeliveryBranch)

		expect(
			branches.map(([, field, branch]) => [field.name, branch.method]),
		).toEqual([
			["city", "courier"],
			["address", "courier"],
			["pickupPoint", "pickup"],
		])
	})
})
