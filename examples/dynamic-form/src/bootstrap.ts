import { createWorld } from "ecsplain"
import {
	ActiveField,
	DeliveryBranch,
	type FieldName,
	FieldValue,
	type FormControl,
	type FormExample,
	FormField,
} from "./model"
import { syncDeliveryBranch } from "./systems"

interface FieldDefinition {
	readonly name: FieldName
	readonly label: string
	readonly control: FormControl
	readonly initialValue: string
	readonly branch?: "courier" | "pickup"
}

const fieldDefinitions: readonly FieldDefinition[] = [
	{
		name: "fullName",
		label: "Full name",
		control: { type: "text", placeholder: "Ada Lovelace" },
		initialValue: "",
	},
	{
		name: "deliveryMethod",
		label: "Delivery method",
		control: {
			type: "select",
			options: [
				{ value: "courier", label: "Courier delivery" },
				{ value: "pickup", label: "Pick up from a location" },
			],
		},
		initialValue: "courier",
	},
	{
		name: "city",
		label: "City",
		control: { type: "text", placeholder: "London" },
		initialValue: "",
		branch: "courier",
	},
	{
		name: "address",
		label: "Street address",
		control: { type: "text", placeholder: "12 Computing Lane" },
		initialValue: "",
		branch: "courier",
	},
	{
		name: "pickupPoint",
		label: "Pickup point",
		control: {
			type: "select",
			options: [
				{ value: "", label: "Choose a pickup point" },
				{ value: "central", label: "Central station" },
				{ value: "riverside", label: "Riverside depot" },
				{ value: "airport", label: "Airport terminal" },
			],
		},
		initialValue: "",
		branch: "pickup",
	},
]

export function createFormExample(): FormExample {
	const world = createWorld()
	const form = world.run(currentWorld => {
		const form = currentWorld.create()
		for (const definition of fieldDefinitions) {
			const fieldData = {
				name: definition.name,
				label: definition.label,
				control: definition.control,
			}
			const value = {
				value: definition.initialValue,
			}

			if (definition.branch === undefined) {
				currentWorld.spawn(
					[FormField, fieldData],
					[FieldValue, value],
					[ActiveField, true],
				)
			} else {
				currentWorld.spawn(
					[FormField, fieldData],
					[FieldValue, value],
					[DeliveryBranch, { method: definition.branch }],
				)
			}
		}

		currentWorld.run(syncDeliveryBranch)
		return form
	})

	return { world, form }
}
