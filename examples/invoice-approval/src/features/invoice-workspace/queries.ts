import { queryOptions } from "@tanstack/react-query"
import type { InvoiceApi, InvoiceListResponse } from "./api"

export const invoiceQueryKey = ["invoices"] as const

export type InvoiceQueryKey = typeof invoiceQueryKey

export function createInvoiceQueryOptions(api: InvoiceApi) {
	return queryOptions({
		queryKey: invoiceQueryKey,
		queryFn: ({ signal }) => api.listInvoices(signal),
		staleTime: 30_000,
		retry: false,
	})
}

export type InvoiceQueryOptions = ReturnType<typeof createInvoiceQueryOptions>
export type InvoiceQueryData = InvoiceListResponse
