declare const componentValue: unique symbol

export interface ComponentToken<Value> {
	readonly name: string
	readonly [componentValue]?: Value
}

export type AnyComponentToken = ComponentToken<unknown>

export type ComponentInput<Token extends AnyComponentToken> =
	Token extends ComponentToken<infer Value> ? Value : never

export type ComponentData<Token extends AnyComponentToken> =
	Token extends ComponentToken<infer Value>
		? Value extends object
			? Readonly<Value>
			: Value
		: never

export function defineComponent<Value>(name: string): ComponentToken<Value> {
	const normalizedName = name.trim()

	if (normalizedName.length === 0) {
		throw new Error("A component name must not be empty")
	}

	return Object.freeze({ name: normalizedName }) as ComponentToken<Value>
}
