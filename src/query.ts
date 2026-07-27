import type {
	AnyComponentToken,
	ComponentData,
	ComponentToken,
} from "./component"
import type { Entity } from "./world"

const optionalTermBrand: unique symbol = Symbol("ecsplain.optional")
const withoutTermBrand: unique symbol = Symbol("ecsplain.without")
const queryDefinitionBrand: unique symbol = Symbol("ecsplain.query")

export interface OptionalTerm<Token extends AnyComponentToken> {
	readonly component: Token
	readonly [optionalTermBrand]: true
}

export interface WithoutTerm<Token extends AnyComponentToken> {
	readonly component: Token
	readonly [withoutTermBrand]: true
}

export type QueryTerm =
	| AnyComponentToken
	| OptionalTerm<AnyComponentToken>
	| WithoutTerm<AnyComponentToken>

export type QueryTerms = readonly [AnyComponentToken, ...QueryTerm[]]

type QueryData<Terms extends readonly QueryTerm[]> = Terms extends readonly [
	infer Head,
	...infer Tail extends readonly QueryTerm[],
]
	? Head extends ComponentToken<infer Value>
		? [Value extends object ? Readonly<Value> : Value, ...QueryData<Tail>]
		: Head extends OptionalTerm<infer Token>
			? [ComponentData<Token> | undefined, ...QueryData<Tail>]
			: QueryData<Tail>
	: []

export type QueryItem<Terms extends QueryTerms> = [
	entity: Entity,
	...components: QueryData<Terms>,
]

export type QueryResult<Terms extends QueryTerms> = Array<QueryItem<Terms>>
export type AnyQueryItem = [entity: Entity, ...components: unknown[]]
export type AnyQueryResult = AnyQueryItem[]

export interface QueryDefinition<Terms extends QueryTerms> {
	readonly terms: Terms
	readonly [queryDefinitionBrand]: true
}

type AnyQueryDefinition = QueryDefinition<QueryTerms>

export function optional<Token extends AnyComponentToken>(
	component: Token,
): OptionalTerm<Token> {
	return Object.freeze({
		component,
		[optionalTermBrand]: true as const,
	})
}

export function without<Token extends AnyComponentToken>(
	component: Token,
): WithoutTerm<Token> {
	return Object.freeze({
		component,
		[withoutTermBrand]: true as const,
	})
}

export function defineQuery<const Terms extends QueryTerms>(
	...terms: Terms
): QueryDefinition<Terms> {
	assertQueryTerms(terms)

	return Object.freeze({
		terms: Object.freeze([...terms]) as unknown as Terms,
		[queryDefinitionBrand]: true as const,
	})
}

export function isOptionalTerm(
	term: QueryTerm,
): term is OptionalTerm<AnyComponentToken> {
	return optionalTermBrand in term
}

export function isWithoutTerm(
	term: QueryTerm,
): term is WithoutTerm<AnyComponentToken> {
	return withoutTermBrand in term
}

function isQueryDefinition(value: unknown): value is AnyQueryDefinition {
	return (
		typeof value === "object" && value !== null && queryDefinitionBrand in value
	)
}

export function resolveQueryTerms(input: readonly unknown[]): QueryTerms {
	if (input.length === 1 && isQueryDefinition(input[0])) {
		return input[0].terms
	}

	assertQueryTerms(input)
	return input
}

export function queryComponents(
	terms: QueryTerms,
): readonly [AnyComponentToken, ...AnyComponentToken[]] {
	const components: AnyComponentToken[] = []
	const seen = new Set<AnyComponentToken>()

	for (const term of terms) {
		const component =
			isOptionalTerm(term) || isWithoutTerm(term) ? term.component : term

		if (!seen.has(component)) {
			seen.add(component)
			components.push(component)
		}
	}

	return components as [AnyComponentToken, ...AnyComponentToken[]]
}

function assertQueryTerms(
	input: readonly unknown[],
): asserts input is QueryTerms {
	const first = input[0]
	if (
		typeof first !== "object" ||
		first === null ||
		!("name" in first) ||
		typeof first.name !== "string"
	) {
		throw new Error("A query requires at least one required component")
	}
}
