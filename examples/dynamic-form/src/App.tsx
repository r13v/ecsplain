import type { Entity } from "ecsplain"
import { useComponent, useQuery, useWorld } from "ecsplain/react"
import type { ChangeEvent, FormEvent } from "react"
import {
	ActiveField,
	FieldError,
	FieldValue,
	FormField,
	FormSubmission,
} from "./model"
import { changeFieldValue, submitDeliveryForm } from "./systems"

function FieldControl({
	field,
	form,
}: {
	readonly field: Entity
	readonly form: Entity
}) {
	const world = useWorld()
	const definition = useComponent(field, FormField)
	const fieldValue = useComponent(field, FieldValue)
	const error = useComponent(field, FieldError)

	if (definition === undefined || fieldValue === undefined) {
		throw new Error("An active field is missing definition or value data")
	}

	const change = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
		world.run(changeFieldValue, {
			form,
			field,
			value: event.currentTarget.value,
		})
	}
	const errorId = `field-error-${field}`
	const controlId = `field-${field}`

	return (
		<label className="form-field" htmlFor={controlId}>
			<span>{definition.label}</span>
			{definition.control.type === "text" ? (
				<input
					id={controlId}
					name={definition.name}
					value={fieldValue.value}
					placeholder={definition.control.placeholder}
					aria-invalid={error !== undefined}
					aria-describedby={error ? errorId : undefined}
					onChange={change}
				/>
			) : (
				<select
					id={controlId}
					name={definition.name}
					value={fieldValue.value}
					aria-invalid={error !== undefined}
					aria-describedby={error ? errorId : undefined}
					onChange={change}
				>
					{definition.control.options.map(option => (
						<option key={option.value} value={option.value}>
							{option.label}
						</option>
					))}
				</select>
			)}
			{error && (
				<small id={errorId} role="alert">
					{error.message}
				</small>
			)}
		</label>
	)
}

export function App({ form }: { readonly form: Entity }) {
	const world = useWorld()
	const fields = useQuery(FormField, FieldValue, ActiveField)
	const submission = useComponent(form, FormSubmission)

	const submit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		world.run(submitDeliveryForm, { form })
	}

	return (
		<main className="page-shell">
			<section className="intro">
				<p className="eyebrow">Ecsplain example</p>
				<h1>A form whose structure lives in ECS</h1>
				<p>
					Changing the delivery method adds and removes ActiveField components.
					Hidden branch values remain in the world, while validation and
					submission only query active fields.
				</p>
			</section>

			<div className="example-layout">
				<form className="form-card" onSubmit={submit} noValidate>
					<header>
						<h2>Delivery request</h2>
						<p>All visible fields are required.</p>
					</header>

					<div className="field-list">
						{fields.map(([field]) => (
							<FieldControl key={field} field={field} form={form} />
						))}
					</div>

					<button className="submit-button" type="submit">
						Submit request
					</button>
				</form>

				<aside className="result-card" aria-live="polite">
					<p className="result-label">Submitted ECS snapshot</p>
					{submission ? (
						<pre data-testid="submission-result">
							{JSON.stringify(submission.values, null, 2)}
						</pre>
					) : (
						<p className="result-placeholder">
							A valid submission will appear here. Inactive values are
							intentionally omitted.
						</p>
					)}
				</aside>
			</div>
		</main>
	)
}
