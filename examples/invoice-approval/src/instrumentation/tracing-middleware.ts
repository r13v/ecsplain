import type { SystemMiddleware } from "ecsplain"

type SystemTraceOutcome = "success" | "error"

interface SystemTraceEvent {
	readonly system: string
	readonly depth: number
	readonly durationMs: number
	readonly outcome: SystemTraceOutcome
}

export interface CreateTracingMiddlewareOptions {
	readonly now?: () => number
}

export function createTracingMiddleware({
	now = currentTime,
}: CreateTracingMiddlewareOptions = {}): SystemMiddleware {
	return (execution, next) => {
		const startedAt = now()

		try {
			const result = next()
			logTraceEvent({
				system: systemName(execution.system),
				depth: execution.depth,
				durationMs: now() - startedAt,
				outcome: "success",
			})
			return result
		} catch (error) {
			logTraceEvent({
				system: systemName(execution.system),
				depth: execution.depth,
				durationMs: now() - startedAt,
				outcome: "error",
			})
			throw error
		}
	}
}

function logTraceEvent(event: SystemTraceEvent): void {
	console.info("ecsplain:system", event)
}

function currentTime(): number {
	return globalThis.performance?.now() ?? Date.now()
}

function systemName(system: { readonly name?: string }): string {
	return system.name || "(anonymous)"
}
