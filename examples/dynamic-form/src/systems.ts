import type { Entity, System, World } from "ecsplain"
import {
	ActiveField,
	DeliveryBranch,
	type DeliveryMethod,
	FieldError,
	type FieldName,
	FieldValue,
	FormField,
	FormSubmission,
} from "./model"

interface ChangeFieldValueInput {
	readonly form: Entity
	readonly field: Entity
	readonly value: string
}

interface FormInput {
	readonly form: Entity
}

function clearFeedback(world: World, form: Entity): void {
	for (const [field] of world.query(FieldError)) {
		world.remove(field, FieldError)
	}
	world.remove(form, FormSubmission)
}

function deliveryMethod(world: World): DeliveryMethod {
	for (const [field, definition] of world.query(FormField)) {
		if (definition.name !== "deliveryMethod") {
			continue
		}

		const value = world.get(field, FieldValue)?.value
		if (value === "courier" || value === "pickup") {
			return value
		}
	}

	throw new Error("The form does not have a valid delivery method")
}

export const syncDeliveryBranch: System = world => {
	const method = deliveryMethod(world)

	for (const [field, branch] of world.query(DeliveryBranch)) {
		if (branch.method === method) {
			world.set(field, ActiveField, true)
		} else {
			world.remove(field, ActiveField)
		}
	}
}

export const changeFieldValue: System<ChangeFieldValueInput> = (
	world,
	{ form, field, value },
) => {
	const definition = world.get(field, FormField)
	if (definition === undefined) {
		throw new Error("Cannot change an entity that is not a form field")
	}

	world.set(field, FieldValue, { value })
	clearFeedback(world, form)

	if (definition.name === "deliveryMethod") {
		world.run(syncDeliveryBranch)
	}
}

export const submitDeliveryForm: System<FormInput, boolean> = (
	world,
	{ form },
) => {
	clearFeedback(world, form)

	const values: Partial<Record<FieldName, string>> = {}
	let valid = true

	for (const [field, definition, fieldValue] of world.query(
		FormField,
		FieldValue,
		ActiveField,
	)) {
		const value = fieldValue.value.trim()
		if (value.length === 0) {
			world.set(field, FieldError, {
				message: `${definition.label} is required.`,
			})
			valid = false
		} else {
			values[definition.name] = value
		}
	}

	if (!valid) {
		return false
	}

	world.set(form, FormSubmission, { values })
	return true
}
