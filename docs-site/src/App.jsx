import {
	ArrowCounterClockwise,
	ArrowRight,
	BookOpen,
	Check,
	CheckCircle,
	ClipboardText,
	Code,
	FileText,
	GithubLogo,
	List,
	MagnifyingGlass,
	Play,
	Receipt,
	Table,
	X,
} from "@phosphor-icons/react"
import { useEffect, useMemo, useRef, useState } from "react"
import { flatLessons, groups, lessons, ui } from "./content.js"

const supportedLocales = ["en", "ru"]
const defaultLocale = "en"
const defaultLesson = "overview"
const githubUrl = "https://github.com/r13v/ecsplain"
const demoPaths = {
	table: "examples/table/",
	"dynamic-form": "examples/dynamic-form/",
	"async-data": "examples/invoice-approval/",
}

function readRoute() {
	const [localeFromHash, lessonFromHash] = window.location.hash
		.replace(/^#\/?/, "")
		.split("/")
	const savedLocale = window.localStorage.getItem("ecsplain-locale")
	const locale = supportedLocales.includes(localeFromHash)
		? localeFromHash
		: supportedLocales.includes(savedLocale)
			? savedLocale
			: defaultLocale
	const lesson = flatLessons.some(item => item.id === lessonFromHash)
		? lessonFromHash
		: defaultLesson

	return { locale, lesson }
}

function navigate(locale, lesson) {
	window.location.hash = `/${locale}/${lesson}`
}

function tokenClass(token) {
	if (
		[
			"const",
			"if",
			"else",
			"for",
			"of",
			"return",
			"true",
			"false",
			"type",
			"function",
			"readonly",
		].includes(token)
	) {
		return "token-keyword"
	}
	if (token.startsWith('"') || token.startsWith("'") || token.startsWith("`")) {
		return "token-string"
	}
	if (/^\d+$/.test(token)) {
		return "token-number"
	}
	if (
		[
			"world",
			"defineComponent",
			"createWorld",
			"useComponent",
			"useComponentSelector",
			"useQuery",
		].includes(token)
	) {
		return "token-api"
	}
	return undefined
}

function HighlightedLine({ line }) {
	const parts = line.split(
		/(\b(?:const|if|else|for|of|return|true|false|type|function|readonly|world|defineComponent|createWorld|useComponent|useComponentSelector|useQuery|\d+)\b|"[^"]*"|'[^']*'|`[^`]*`)/g,
	)
	let offset = 0

	return parts.map(part => {
		const key = `${offset}:${part}`
		offset += part.length
		return (
			<span className={tokenClass(part)} key={key}>
				{part}
			</span>
		)
	})
}

function Header({ copy, locale, lessonId, onMenu, onSearch, search }) {
	return (
		<header className="site-header">
			<button
				className="mobile-menu-button"
				type="button"
				aria-label={copy.menu}
				onClick={onMenu}
			>
				<List size={22} weight="bold" />
			</button>

			<a className="brand" href={`#/${locale}/${defaultLesson}`}>
				<span>ECSPLAIN</span>
				<i aria-hidden="true" />
				<small>{copy.docs}</small>
			</a>

			<label className="search-control">
				<MagnifyingGlass size={18} />
				<input
					aria-label={copy.search}
					onChange={event => onSearch(event.currentTarget.value)}
					placeholder={copy.search}
					type="search"
					value={search}
				/>
				<kbd>⌘K</kbd>
			</label>

			<a
				className="github-link"
				href={githubUrl}
				target="_blank"
				rel="noreferrer"
			>
				<GithubLogo size={20} weight="fill" />
				<span>{copy.github}</span>
			</a>

			<fieldset className="locale-switch">
				<legend className="sr-only">{copy.language}</legend>
				{supportedLocales.map(nextLocale => (
					<button
						aria-pressed={locale === nextLocale}
						className={locale === nextLocale ? "is-active" : undefined}
						key={nextLocale}
						onClick={() => navigate(nextLocale, lessonId)}
						type="button"
					>
						{nextLocale.toUpperCase()}
					</button>
				))}
			</fieldset>
		</header>
	)
}

function Curriculum({ copy, currentId, locale, mobileOpen, onClose, query }) {
	const currentIndex = flatLessons.findIndex(item => item.id === currentId)
	const progress = Math.round(((currentIndex + 1) / flatLessons.length) * 100)
	const normalizedQuery = query.trim().toLocaleLowerCase(locale)
	const visibleGroups = groups
		.map(group => ({
			...group,
			items: group.items.filter(item =>
				item[locale].toLocaleLowerCase(locale).includes(normalizedQuery),
			),
		}))
		.filter(group => group.items.length > 0)

	return (
		<>
			{mobileOpen && (
				<button
					className="sidebar-scrim"
					type="button"
					aria-label={copy.close}
					onClick={onClose}
				/>
			)}
			<aside className={`curriculum ${mobileOpen ? "is-open" : ""}`}>
				<div className="sidebar-mobile-head">
					<span>{copy.docs}</span>
					<button type="button" aria-label={copy.close} onClick={onClose}>
						<X size={20} />
					</button>
				</div>

				<div className="progress-block">
					<div>
						<span>{copy.progress}</span>
						<strong>{progress}%</strong>
					</div>
					<div className="progress-track">
						<i style={{ width: `${progress}%` }} />
					</div>
				</div>

				<nav aria-label={copy.curriculum}>
					{visibleGroups.length === 0 ? (
						<p className="empty-search">{copy.noResults}</p>
					) : (
						visibleGroups.map(group => (
							<section className="nav-group" key={group.id}>
								<h2>{group.title[locale]}</h2>
								{group.items.map(item => {
									const isComplete =
										flatLessons.findIndex(lesson => lesson.id === item.id) <
										currentIndex
									return (
										<a
											className={
												item.id === currentId ? "is-active" : undefined
											}
											href={`#/${locale}/${item.id}`}
											key={item.id}
											onClick={onClose}
										>
											<span className="lesson-number">
												{isComplete ? (
													<Check size={12} weight="bold" />
												) : (
													item.number
												)}
											</span>
											<span>{item[locale]}</span>
										</a>
									)
								})}
							</section>
						))
					)}
				</nav>

				<a
					className="long-form-link"
					href={`${githubUrl}/blob/main/docs/tutorial.md`}
					target="_blank"
					rel="noreferrer"
				>
					<BookOpen size={19} />
					<span>{copy.longForm}</span>
					<ArrowRight size={16} />
				</a>
			</aside>
		</>
	)
}

function CodePanel({ code, copy, copyLabel, isInteractive, selected, onCopy }) {
	const lines = code.split("\n")
	const activeLine = isInteractive
		? lines.findIndex(line =>
				line.includes(selected ? "world.set" : "world.remove"),
			)
		: -1
	let lineOffset = 0

	return (
		<section className="code-panel" aria-label={copy.typeScriptExample}>
			<header>
				<div>
					<Code size={18} weight="bold" />
					<strong>{copy.typeScriptSystem}</strong>
				</div>
				<button type="button" onClick={onCopy}>
					<ClipboardText size={17} />
					<span>{copyLabel}</span>
				</button>
			</header>
			<pre>
				<code>
					{lines.map((line, index) => {
						const key = `${lineOffset}:${line}`
						lineOffset += line.length + 1
						return (
							<span
								className={`code-line ${index === activeLine ? "is-active" : ""}`}
								key={key}
							>
								<i>{index + 1}</i>
								<b>
									<HighlightedLine line={line} />
								</b>
							</span>
						)
					})}
				</code>
			</pre>
			{isInteractive && (
				<footer>
					<span>{copy.event}</span>
					<code>{`toggleSelection({ cell: e2 })`}</code>
				</footer>
			)}
		</section>
	)
}

function EntityTokens({ values }) {
	return (
		<div className="component-list">
			{values.map(value => (
				<span
					className={value === "SelectedCell" ? "is-selected" : undefined}
					key={value}
				>
					{value}
				</span>
			))}
		</div>
	)
}

function WorldInspector({ copy, lesson, previousSelected, selected }) {
	const isInteractive = lesson.interactive === true
	const rows = [
		{ entity: "e1", components: ["UserRow"], selected: null },
		{
			entity: "e2",
			components: ["TableCell", ...(selected ? ["SelectedCell"] : [])],
			selected,
		},
		{ entity: "e3", components: ["TableColumn"], selected: null },
	]

	return (
		<section className="world-panel">
			<header>
				<div>
					<strong>{isInteractive ? copy.liveWorld : copy.keyIdeas}</strong>
				</div>
				{isInteractive && (
					<div className="world-status">
						<span>{copy.entities}</span>
						<i />
						<span>{copy.autoUpdates}</span>
					</div>
				)}
			</header>

			{isInteractive ? (
				<>
					<div className="entity-table">
						<div className="entity-row entity-head">
							<strong>{copy.entity}</strong>
							<strong>{copy.components}</strong>
							<strong>{copy.selected}</strong>
						</div>
						{rows.map(row => (
							<div className="entity-row" key={row.entity}>
								<code>{row.entity}</code>
								<EntityTokens values={row.components} />
								<span className={row.selected ? "value-on" : "value-off"}>
									{row.selected === null ? "—" : row.selected ? "true" : "—"}
								</span>
							</div>
						))}
					</div>

					<div className="change-summary">
						<h3>{copy.changeSummary}</h3>
						<div>
							<article>
								<span>{copy.before}</span>
								<code>
									{previousSelected === null
										? "SelectedCell —"
										: previousSelected
											? "SelectedCell true"
											: "SelectedCell —"}
								</code>
							</article>
							<ArrowRight size={22} />
							<article>
								<span>{copy.after}</span>
								<code>{selected ? "SelectedCell true" : "SelectedCell —"}</code>
							</article>
						</div>
					</div>
				</>
			) : (
				<div className="key-ideas">
					{lesson.takeaways.map((takeaway, index) => (
						<article key={takeaway}>
							<span>{String(index + 1).padStart(2, "0")}</span>
							<p>{takeaway}</p>
						</article>
					))}
				</div>
			)}
		</section>
	)
}

function RelatedExamples({ copy, locale }) {
	return (
		<section className="related-examples">
			<span>{copy.examples}</span>
			<a href={`#/${locale}/table`}>
				<Table size={21} />
				<div>
					<strong>{copy.table}</strong>
					<small>{copy.tableCaption}</small>
				</div>
				<ArrowRight size={18} />
			</a>
			<a href={`#/${locale}/dynamic-form`}>
				<FileText size={21} />
				<div>
					<strong>{copy.form}</strong>
					<small>{copy.formCaption}</small>
				</div>
				<ArrowRight size={18} />
			</a>
			<a href={`#/${locale}/async-data`}>
				<Receipt size={21} />
				<div>
					<strong>{copy.invoice}</strong>
					<small>{copy.invoiceCaption}</small>
				</div>
				<ArrowRight size={18} />
			</a>
		</section>
	)
}

function LessonPager({ copy, currentId, locale }) {
	const currentIndex = flatLessons.findIndex(item => item.id === currentId)
	const previous = flatLessons[currentIndex - 1]
	const next = flatLessons[currentIndex + 1]

	return (
		<nav className="lesson-pager" aria-label={copy.lessonNavigation}>
			{previous ? (
				<a href={`#/${locale}/${previous.id}`}>
					<span>← {copy.previous}</span>
					<strong>{previous[locale]}</strong>
				</a>
			) : (
				<span />
			)}
			{next ? (
				<a className="next-link" href={`#/${locale}/${next.id}`}>
					<span>{copy.next} →</span>
					<strong>{next[locale]}</strong>
				</a>
			) : (
				<span />
			)}
		</nav>
	)
}

export function App() {
	const [route, setRoute] = useState(readRoute)
	const [selected, setSelected] = useState(false)
	const [previousSelected, setPreviousSelected] = useState(null)
	const [copied, setCopied] = useState(false)
	const [search, setSearch] = useState("")
	const [mobileOpen, setMobileOpen] = useState(false)
	const copyTimer = useRef(undefined)

	const locale = route.locale
	const lessonId = route.lesson
	const copy = ui[locale]
	const lesson = lessons[lessonId]?.[locale] ?? lessons[defaultLesson][locale]
	const lessonIndex = flatLessons.findIndex(item => item.id === lessonId)
	const completion = Math.round(((lessonIndex + 1) / flatLessons.length) * 100)
	const demoPath = demoPaths[lessonId]
	const demoUrl = demoPath
		? new URL(
				demoPath,
				new URL(import.meta.env.BASE_URL, window.location.origin),
			).href
		: null

	useEffect(() => {
		const onHashChange = () => setRoute(readRoute())
		if (window.location.hash.length === 0) {
			navigate(route.locale, route.lesson)
		}
		window.addEventListener("hashchange", onHashChange)
		return () => window.removeEventListener("hashchange", onHashChange)
	}, [route.lesson, route.locale])

	useEffect(() => {
		window.localStorage.setItem("ecsplain-locale", locale)
		document.documentElement.lang = locale
		document.title =
			locale === "ru"
				? `${lesson.title} — ECSplain`
				: `${lesson.title} — ECSplain Docs`
		setSelected(false)
		setPreviousSelected(null)
		setCopied(false)
		window.scrollTo({ top: 0, behavior: "auto" })
	}, [lesson.title, locale])

	useEffect(
		() => () => {
			window.clearTimeout(copyTimer.current)
		},
		[],
	)

	useEffect(() => {
		const onShortcut = event => {
			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
				event.preventDefault()
				document.querySelector(".search-control input")?.focus()
			}
		}
		window.addEventListener("keydown", onShortcut)
		return () => window.removeEventListener("keydown", onShortcut)
	}, [])

	const runSystem = () => {
		setPreviousSelected(selected)
		setSelected(current => !current)
	}

	const resetWorld = () => {
		setPreviousSelected(null)
		setSelected(false)
	}

	const copyCode = async () => {
		if (navigator.clipboard) {
			await navigator.clipboard.writeText(lesson.code)
		} else {
			const textArea = document.createElement("textarea")
			textArea.value = lesson.code
			textArea.style.position = "fixed"
			textArea.style.opacity = "0"
			document.body.append(textArea)
			textArea.select()
			document.execCommand("copy")
			textArea.remove()
		}
		setCopied(true)
		window.clearTimeout(copyTimer.current)
		copyTimer.current = window.setTimeout(() => setCopied(false), 1600)
	}

	const searchHint = useMemo(() => {
		if (search.trim().length === 0) {
			return null
		}
		return copy.searchResults
	}, [copy.searchResults, search])

	return (
		<div className="docs-app">
			<Header
				copy={copy}
				locale={locale}
				lessonId={lessonId}
				onMenu={() => setMobileOpen(true)}
				onSearch={setSearch}
				search={search}
			/>
			<Curriculum
				copy={copy}
				currentId={lessonId}
				locale={locale}
				mobileOpen={mobileOpen}
				onClose={() => setMobileOpen(false)}
				query={search}
			/>

			<main className="lesson">
				{searchHint && <div className="search-hint">{searchHint}</div>}
				<section className="lesson-hero">
					<span className="eyebrow">{lesson.eyebrow}</span>
					<h1>{lesson.title}</h1>
					<p>{lesson.subtitle}</p>

					<div className="lesson-actions">
						{lesson.interactive ? (
							<>
								<button
									className="primary-action"
									type="button"
									onClick={runSystem}
								>
									<Play size={18} weight="fill" />
									{copy.run}
								</button>
								<button
									className="secondary-action"
									type="button"
									onClick={resetWorld}
								>
									<ArrowCounterClockwise size={18} />
									{copy.reset}
								</button>
							</>
						) : (
							<>
								<a
									className="primary-action"
									href={`#/${locale}/${flatLessons[lessonIndex + 1]?.id ?? defaultLesson}`}
								>
									{copy.next}
									<ArrowRight size={18} />
								</a>
								{demoUrl && (
									<a
										className="secondary-action"
										href={demoUrl}
										target="_blank"
										rel="noreferrer"
									>
										{copy.openDemo}
										<ArrowRight size={18} />
									</a>
								)}
							</>
						)}
					</div>
				</section>

				<div className="learning-workspace">
					<CodePanel
						code={lesson.code}
						copy={copy}
						copyLabel={copied ? copy.copied : copy.copy}
						isInteractive={lesson.interactive === true}
						onCopy={copyCode}
						selected={selected}
					/>
					<WorldInspector
						copy={copy}
						lesson={lesson}
						previousSelected={previousSelected}
						selected={selected}
					/>
				</div>

				<section className="lesson-notes">
					<div>
						{lesson.paragraphs.map(paragraph => (
							<p key={paragraph}>{paragraph}</p>
						))}
					</div>
					<aside>
						<CheckCircle size={22} weight="fill" />
						<div>
							<strong>{copy.keyIdeas}</strong>
							<span>{completion}%</span>
						</div>
					</aside>
				</section>

				<RelatedExamples copy={copy} locale={locale} />
				<LessonPager copy={copy} currentId={lessonId} locale={locale} />
			</main>
		</div>
	)
}
