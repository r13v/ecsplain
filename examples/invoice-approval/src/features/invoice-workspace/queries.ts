import { queryOptions } from "@tanstack/react-query"
import type { InvoiceApi, InvoiceDto, InvoiceListResponse } from "./api"

export const invoiceQueryKey = ["invoices"] as const

export type InvoiceQueryKey = typeof invoiceQueryKey

export function createInvoiceQueryOptions(api: InvoiceApi) {
	return queryOptions<
		InvoiceListResponse,
		Error,
		InvoiceListResponse,
		InvoiceQueryKey
	>({
		queryKey: invoiceQueryKey,
		queryFn: ({ signal }) => api.listInvoices(signal),
		staleTime: 30_000,
		retry: false,
		structuralSharing: mergeFetchedInvoiceList,
	})
}

export type InvoiceQueryOptions = ReturnType<typeof createInvoiceQueryOptions>
export type InvoiceQueryData = InvoiceListResponse

function mergeInvoiceListByVersion(
	current: InvoiceListResponse | undefined,
	incoming: InvoiceListResponse,
): InvoiceListResponse {
	if (current === undefined) {
		return incoming
	}

	const currentById = new Map(
		current.items.map(invoice => [invoice.id, invoice]),
	)
	const incomingIds = new Set(incoming.items.map(invoice => invoice.id))
	let didChange = false

	const items: InvoiceDto[] = incoming.items.map(invoice => {
		const cached = currentById.get(invoice.id)
		if (cached !== undefined && invoice.version <= cached.version) {
			return cached
		}

		didChange = true
		return invoice
	})

	for (const cached of current.items) {
		if (!incomingIds.has(cached.id)) {
			items.push(cached)
		}
	}

	if (!didChange) {
		return current
	}

	return { ...incoming, items }
}

function mergeFetchedInvoiceList(
	current: unknown | undefined,
	incoming: unknown,
): InvoiceListResponse {
	return mergeInvoiceListByVersion(
		current as InvoiceListResponse | undefined,
		incoming as InvoiceListResponse,
	)
}
