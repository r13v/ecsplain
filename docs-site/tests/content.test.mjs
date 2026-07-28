import assert from "node:assert/strict"
import test from "node:test"
import { flatLessons, groups, lessons, ui } from "../src/content.js"

test("keeps invoice approval as the third complete bilingual example", () => {
	const completeExamples = groups.find(group => group.id === "examples")
	const scenarios = groups.find(group => group.id === "scenarios")

	assert.deepEqual(
		completeExamples?.items.map(item => item.id),
		["table", "dynamic-form", "async-data"],
	)
	assert.equal(
		scenarios?.items.some(item => item.id === "async-data"),
		false,
	)
	assert.equal(flatLessons.find(item => item.id === "async-data")?.number, "09")
	assert.equal(lessons["async-data"].en.eyebrow, "Complete example")
	assert.equal(lessons["async-data"].ru.eyebrow, "Готовый пример")
	assert.match(lessons["async-data"].en.subtitle, /TanStack Query/)
	assert.match(lessons["async-data"].ru.subtitle, /TanStack Query/)
	assert.equal(ui.en.invoice, "Invoice approval")
	assert.equal(ui.ru.invoice, "Согласование счетов")
})
