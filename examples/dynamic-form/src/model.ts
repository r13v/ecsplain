import { defineComponent, type Entity, type World } from "ecsplain"

export type DeliveryMethod = "courier" | "pickup"
export type FieldName =
	| "fullName"
	| "deliveryMethod"
	| "city"
	| "address"
	| "pickupPoint"

export type FormControl =
	| { readonly type: "text"; readonly placeholder?: string }
	| {
			readonly type: "select"
			readonly options: readonly {
				readonly value: string
				readonly label: string
			}[]
	  }

export interface FormFieldData {
	readonly name: FieldName
	readonly label: string
	readonly control: FormControl
}

export interface FieldValueData {
	readonly value: string
}

export interface DeliveryBranchData {
	readonly method: DeliveryMethod
}

export interface FieldErrorData {
	readonly message: string
}

export interface FormSubmissionData {
	readonly values: Readonly<Partial<Record<FieldName, string>>>
}

export interface FormExample {
	readonly world: World
	readonly form: Entity
}

export const FormField = defineComponent<FormFieldData>("FormField")
export const FieldValue = defineComponent<FieldValueData>("FieldValue")
export const ActiveField = defineComponent<true>("ActiveField")
export const DeliveryBranch =
	defineComponent<DeliveryBranchData>("DeliveryBranch")
export const FieldError = defineComponent<FieldErrorData>("FieldError")
export const FormSubmission =
	defineComponent<FormSubmissionData>("FormSubmission")
