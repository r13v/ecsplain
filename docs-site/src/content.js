export const groups = [
	{
		id: "foundations",
		title: { en: "Foundations", ru: "Основы" },
		items: [
			{ id: "overview", number: "01", en: "Overview", ru: "Обзор" },
			{ id: "entities", number: "02", en: "Entities", ru: "Сущности" },
			{ id: "components", number: "03", en: "Components", ru: "Компоненты" },
			{ id: "queries", number: "04", en: "Queries", ru: "Запросы" },
			{ id: "systems", number: "05", en: "Systems", ru: "Системы" },
			{
				id: "react",
				number: "06",
				en: "React bindings",
				ru: "Интеграция с React",
			},
		],
	},
	{
		id: "examples",
		title: { en: "Complete examples", ru: "Готовые примеры" },
		items: [
			{
				id: "table",
				number: "07",
				en: "Table data grid",
				ru: "Таблица данных",
			},
			{
				id: "dynamic-form",
				number: "08",
				en: "Dynamic form",
				ru: "Динамическая форма",
			},
		],
	},
	{
		id: "scenarios",
		title: { en: "Application scenarios", ru: "Прикладные сценарии" },
		items: [
			{
				id: "async-data",
				number: "09",
				en: "Async server data",
				ru: "Асинхронные данные",
			},
			{
				id: "crud",
				number: "10",
				en: "Master-detail CRUD",
				ru: "Master-detail CRUD",
			},
			{
				id: "optimistic",
				number: "11",
				en: "Optimistic updates",
				ru: "Оптимистичные обновления",
			},
			{
				id: "toasts",
				number: "12",
				en: "Toast notifications",
				ru: "Уведомления",
			},
			{
				id: "modals",
				number: "13",
				en: "Modals and overlays",
				ru: "Модальные окна",
			},
			{
				id: "kanban",
				number: "14",
				en: "Kanban drag-and-drop",
				ru: "Kanban и drag-and-drop",
			},
			{
				id: "async-validation",
				number: "15",
				en: "Async validation",
				ru: "Асинхронная валидация",
			},
			{
				id: "ownership",
				number: "16",
				en: "Multiple instances",
				ru: "Несколько экземпляров",
			},
			{
				id: "routing",
				number: "17",
				en: "URL synchronization",
				ru: "Синхронизация с URL",
			},
			{
				id: "permissions",
				number: "18",
				en: "Capabilities",
				ru: "Возможности и права",
			},
		],
	},
	{
		id: "practice",
		title: { en: "Practice", ru: "Практика" },
		items: [
			{
				id: "recipes",
				number: "19",
				en: "Reusable recipes",
				ru: "Типовые рецепты",
			},
			{
				id: "testing",
				number: "20",
				en: "Testing systems",
				ru: "Тестирование систем",
			},
			{
				id: "boundaries",
				number: "21",
				en: "Framework boundaries",
				ru: "Границы фреймворка",
			},
			{
				id: "exercises",
				number: "22",
				en: "Guided exercises",
				ru: "Практические задания",
			},
		],
	},
]

export const flatLessons = groups.flatMap(group => group.items)

export const ui = {
	en: {
		docs: "Docs",
		search: "Search documentation…",
		searchResults: "Matching chapters",
		github: "GitHub",
		progress: "Your progress",
		run: "Run the system",
		reset: "Reset world",
		copy: "Copy code",
		copied: "Copied",
		liveWorld: "Live ECS world",
		entities: "3 entities",
		autoUpdates: "Auto-updates",
		entity: "Entity",
		components: "Components",
		selected: "SelectedCell",
		changeSummary: "Change summary",
		before: "Before",
		after: "After",
		keyIdeas: "Key ideas",
		previous: "Previous",
		next: "Next",
		examples: "Explore related examples",
		table: "Table data grid",
		tableCaption: "Filtering, sorting, range selection, and in-place editing.",
		form: "Dynamic form",
		formCaption: "Active fields, branch preservation, and validation.",
		menu: "Open curriculum",
		close: "Close curriculum",
		noResults: "No chapters match this search.",
		longForm: "Read the long-form tutorial",
		language: "Language",
		curriculum: "Tutorial curriculum",
		typeScriptSystem: "TypeScript system",
		typeScriptExample: "TypeScript example",
		event: "event",
		lessonNavigation: "Lesson navigation",
		openDemo: "Open live example",
	},
	ru: {
		docs: "Документация",
		search: "Поиск по документации…",
		searchResults: "Подходящие главы",
		github: "GitHub",
		progress: "Ваш прогресс",
		run: "Запустить систему",
		reset: "Сбросить world",
		copy: "Копировать код",
		copied: "Скопировано",
		liveWorld: "Состояние ECS world",
		entities: "3 сущности",
		autoUpdates: "Обновляется автоматически",
		entity: "Сущность",
		components: "Компоненты",
		selected: "SelectedCell",
		changeSummary: "Что изменилось",
		before: "До",
		after: "После",
		keyIdeas: "Главные идеи",
		previous: "Назад",
		next: "Далее",
		examples: "Связанные примеры",
		table: "Таблица данных",
		tableCaption:
			"Фильтрация, сортировка, выделение диапазона и редактирование.",
		form: "Динамическая форма",
		formCaption: "Активные поля, сохранение веток и валидация.",
		menu: "Открыть содержание",
		close: "Закрыть содержание",
		noResults: "По вашему запросу ничего не найдено.",
		longForm: "Открыть полное руководство",
		language: "Язык",
		curriculum: "Содержание руководства",
		typeScriptSystem: "Система на TypeScript",
		typeScriptExample: "Пример на TypeScript",
		event: "событие",
		lessonNavigation: "Навигация по урокам",
		openDemo: "Открыть живой пример",
	},
}

export const lessons = {
	overview: {
		en: {
			eyebrow: "Start here",
			title: "Model application state as data",
			subtitle:
				"ECSplain separates identity, passive data, and behavior so complex UI state stays explicit and testable.",
			paragraphs: [
				"An entity is an opaque ID. Components attach typed data to that ID. Systems query the world and replace components in one synchronous batch.",
				"React remains the renderer. Browser events become plain system inputs, while scoped subscriptions wake only the consumers that read changed state.",
			],
			takeaways: [
				"Identity, data, and behavior stay separate.",
				"Components contain no methods or browser APIs.",
				"Systems are synchronous and compose through world.run.",
			],
			code: `const world = createWorld()
const task = world.spawn([
  Task,
  {
    title: "Learn ECSplain",
    completed: false,
  },
])`,
		},
		ru: {
			eyebrow: "Начните здесь",
			title: "Представляйте состояние приложения как данные",
			subtitle:
				"ECSplain разделяет идентичность, пассивные данные и поведение, чтобы сложный UI оставался явным и тестируемым.",
			paragraphs: [
				"Entity — непрозрачный идентификатор. Компоненты добавляют к нему типизированные данные. Системы запрашивают world и заменяют компоненты в одном синхронном batch.",
				"React отвечает за рендеринг. Браузерные события превращаются во входные данные систем, а точечные подписки обновляют только нужных потребителей.",
			],
			takeaways: [
				"Идентичность, данные и поведение разделены.",
				"Компоненты не содержат методов и browser API.",
				"Системы синхронны и компонуются через world.run.",
			],
			code: `const world = createWorld()
const task = world.spawn([
  Task,
  {
    title: "Изучить ECSplain",
    completed: false,
  },
])`,
		},
	},
	entities: {
		en: {
			eyebrow: "Foundation",
			title: "Entities are stable identities",
			subtitle:
				"An entity does not imply a class or schema. Its current components determine what it can do.",
			paragraphs: [
				"Create an entity whenever something needs stable identity: a row, column, cell, form field, screen, request, toast, or drag session.",
				"IDs increase and are never reused. Destroying an entity removes its attached components, but relationship cleanup remains an application decision.",
			],
			takeaways: [
				"Use entity IDs in relationships instead of duplicating records.",
				"Do not use array indexes as durable identity.",
				"Make deletion repair dependent state explicitly.",
			],
			code: `const row = world.spawn([UserRow, user])
const column = world.spawn([TableColumn, definition])
const cell = world.spawn([
  TableCell,
  { row, column },
])`,
		},
		ru: {
			eyebrow: "Основа",
			title: "Entities дают стабильную идентичность",
			subtitle:
				"Entity не задаёт класс или схему. Возможности определяются компонентами, которые есть у неё сейчас.",
			paragraphs: [
				"Создавайте entity для всего, чему нужна стабильная идентичность: строки, колонки, ячейки, поля формы, экрана, запроса, toast или drag-сессии.",
				"Идентификаторы возрастают и не переиспользуются. Удаление entity снимает компоненты, но очистка связей остаётся решением приложения.",
			],
			takeaways: [
				"Связывайте данные через entity ID, не копируйте записи.",
				"Не используйте индекс массива как постоянный ID.",
				"После удаления явно восстанавливайте зависимое состояние.",
			],
			code: `const row = world.spawn([UserRow, user])
const column = world.spawn([TableColumn, definition])
const cell = world.spawn([
  TableCell,
  { row, column },
])`,
		},
	},
	components: {
		en: {
			eyebrow: "Foundation",
			title: "Components are passive typed data",
			subtitle:
				"A component token gives one data shape a unique runtime identity and precise TypeScript types.",
			paragraphs: [
				"Define tokens once at module scope. Attach object data for records and marker components when presence itself is meaningful.",
				"Reads are readonly by contract. Observable changes must pass a new value through set, update, remove, or a system that uses them.",
			],
			takeaways: [
				"Keep behavior out of components.",
				"Use markers for selected, active, expanded, or pending sets.",
				"Never mutate a value returned by world.get.",
			],
			code: `const UserRow = defineComponent<UserRowData>("UserRow")
const SelectedCell = defineComponent<true>("SelectedCell")

world.set(row, UserRow, user)
world.set(cell, SelectedCell, true)`,
		},
		ru: {
			eyebrow: "Основа",
			title: "Components — пассивные типизированные данные",
			subtitle:
				"Component token задаёт форме данных уникальную runtime-идентичность и точные TypeScript-типы.",
			paragraphs: [
				"Определяйте tokens один раз на уровне модуля. Используйте объекты для записей и marker components, когда смысл имеет само наличие.",
				"Чтение readonly по контракту. Наблюдаемое изменение должно пройти через set, update, remove или систему.",
			],
			takeaways: [
				"Не помещайте поведение в компоненты.",
				"Markers удобны для selected, active, expanded и pending.",
				"Не мутируйте значение, полученное через world.get.",
			],
			code: `const UserRow = defineComponent<UserRowData>("UserRow")
const SelectedCell = defineComponent<true>("SelectedCell")

world.set(row, UserRow, user)
world.set(cell, SelectedCell, true)`,
		},
	},
	queries: {
		en: {
			eyebrow: "Foundation",
			title: "Query entities by capability",
			subtitle:
				"A query returns a deterministic snapshot selected by required, optional, and excluded component terms.",
			paragraphs: [
				"Normal tokens are required. optional(token) returns data without requiring it, while without(token) excludes matching entities.",
				"defineQuery creates a reusable immutable descriptor. Snapshots stay ordered by entity ID and safe to iterate while a system changes the world.",
			],
			takeaways: [
				"Query for capabilities, not object classes.",
				"Share defineQuery descriptors between systems and React.",
				"Queries are snapshots, not cached live collections.",
			],
			code: `const VisibleRows = defineQuery(
  UserRow,
  optional(SelectedRow),
  without(Archived),
)

for (const [row, data, selected] of world.query(
  VisibleRows,
)) {
  console.log(row, data.name, selected === true)
}`,
		},
		ru: {
			eyebrow: "Основа",
			title: "Запрашивайте entities по возможностям",
			subtitle:
				"Query возвращает детерминированный snapshot по required, optional и excluded component terms.",
			paragraphs: [
				"Обычные tokens обязательны. optional(token) возвращает данные, не требуя компонент, а without(token) исключает совпавшие entities.",
				"defineQuery создаёт переиспользуемый immutable descriptor. Snapshots остаются отсортированными по entity ID и безопасными при изменениях world.",
			],
			takeaways: [
				"Запрашивайте возможности, а не классы объектов.",
				"Переиспользуйте defineQuery в systems и React.",
				"Query — snapshot, а не кешированная live-коллекция.",
			],
			code: `const VisibleRows = defineQuery(
  UserRow,
  optional(SelectedRow),
  without(Archived),
)

for (const [row, data, selected] of world.query(
  VisibleRows,
)) {
  console.log(row, data.name, selected === true)
}`,
		},
	},
	systems: {
		en: {
			eyebrow: "Interactive lesson",
			title: "See the world change",
			subtitle:
				"An event arrives. A system runs. Components change. Run the real ECSplain flow and inspect the batch.",
			paragraphs: [
				"The system below toggles a marker component on one cell entity. Saved row data and unrelated entities are untouched.",
				"Nested writes share one world.run batch, so React observes one completed state transition rather than intermediate steps.",
			],
			takeaways: [
				"Systems receive plain typed inputs.",
				"Marker presence is enough to model selection.",
				"A batch groups notifications but does not provide rollback.",
			],
			code: `const SelectedCell = defineComponent<true>("SelectedCell")

const toggleSelection: System<{ cell: Entity }> = (
  world,
  { cell },
) => {
  if (world.has(cell, SelectedCell)) {
    world.remove(cell, SelectedCell)
  } else {
    world.set(cell, SelectedCell, true)
  }
}

world.run(toggleSelection, { cell: e2 })`,
			interactive: true,
		},
		ru: {
			eyebrow: "Интерактивный урок",
			title: "Посмотрите, как меняется world",
			subtitle:
				"Приходит событие. Запускается система. Компоненты меняются. Выполните настоящий flow ECSplain и изучите batch.",
			paragraphs: [
				"Система переключает marker component на одной cell entity. Сохранённые данные строки и остальные entities не затрагиваются.",
				"Вложенные записи входят в один world.run batch, поэтому React видит завершённый переход, а не промежуточные состояния.",
			],
			takeaways: [
				"Системы получают простые типизированные inputs.",
				"Наличия marker достаточно для моделирования selection.",
				"Batch группирует уведомления, но не делает rollback.",
			],
			code: `const SelectedCell = defineComponent<true>("SelectedCell")

const toggleSelection: System<{ cell: Entity }> = (
  world,
  { cell },
) => {
  if (world.has(cell, SelectedCell)) {
    world.remove(cell, SelectedCell)
  } else {
    world.set(cell, SelectedCell, true)
  }
}

world.run(toggleSelection, { cell: e2 })`,
			interactive: true,
		},
	},
	react: {
		en: {
			eyebrow: "React boundary",
			title: "Subscribe where state is rendered",
			subtitle:
				"React translates browser events into system inputs and renders scoped snapshots from the world.",
			paragraphs: [
				"WorldProvider exposes one world. useQuery subscribes to every term in a query descriptor, while useComponent targets one entity-token pair.",
				"useComponentSelector selects from one component. useQuerySelector selects from reusable query rows and avoids a rerender when the result stays equal.",
			],
			takeaways: [
				"Keep browser handlers thin.",
				"Place subscriptions close to their consumers.",
				"Do not repair ECS state from React effects.",
			],
			code: `const SelectedCells = defineQuery(SelectedCell)

function SelectionCount() {
  const count = useQuerySelector(
    SelectedCells,
    rows => rows.length,
  )

  return <output>{count}</output>
}`,
		},
		ru: {
			eyebrow: "Граница React",
			title: "Подписывайтесь там, где состояние рендерится",
			subtitle:
				"React переводит browser events во входы систем и отображает точечные snapshots из world.",
			paragraphs: [
				"WorldProvider предоставляет world. useQuery подписывается на все terms query descriptor, а useComponent — на пару entity-token.",
				"useComponentSelector выбирает данные одного компонента. useQuerySelector выбирает значение из строк reusable query и не рендерит при равном результате.",
			],
			takeaways: [
				"Browser handlers должны быть тонкими.",
				"Размещайте подписки рядом с потребителями.",
				"Не исправляйте ECS-состояние из React effects.",
			],
			code: `const SelectedCells = defineQuery(SelectedCell)

function SelectionCount() {
  const count = useQuerySelector(
    SelectedCells,
    rows => rows.length,
  )

  return <output>{count}</output>
}`,
		},
	},
}

const scenarioLessons = {
	table: {
		en: [
			"Row entities own authoritative UserRow data. Column entities describe fields. Stable cell entities connect one row to one column.",
			"Filters and sort live on the table entity, while TableView is a manually rebuilt derived snapshot. SelectedCell, FocusedCell, CellDraft, and CellError stay at cell granularity.",
		],
		ru: [
			"Row entities хранят authoritative UserRow. Column entities описывают поля. Стабильные cell entities связывают строку и колонку.",
			"Filters и sort живут на table entity, а TableView — вручную пересобираемый derived snapshot. SelectedCell, FocusedCell, CellDraft и CellError остаются на уровне ячейки.",
		],
		code: `type TableCellData = {
  readonly row: Entity
  readonly column: Entity
}

const TableCell = defineComponent<TableCellData>("TableCell")
const SelectedCell = defineComponent<true>("SelectedCell")
const CellDraft = defineComponent<{ value: string }>("CellDraft")`,
	},
	"dynamic-form": {
		en: [
			"Each field is an entity with metadata, a preserved FieldValue, and ActiveField when it belongs to the current structure.",
			"Changing delivery method adds or removes ActiveField. Hidden values remain in the world, while validation and submission query only active fields.",
		],
		ru: [
			"Каждое поле — entity с metadata, сохранённым FieldValue и ActiveField, когда поле входит в текущую структуру.",
			"Смена способа доставки добавляет или удаляет ActiveField. Скрытые значения остаются в world, а validation и submit запрашивают только активные поля.",
		],
		code: `const Branches = defineQuery(
  DeliveryBranch,
  optional(ActiveField),
)

for (const [field, branch, active] of world.query(Branches)) {
  if (branch.method === method && !active) {
    world.set(field, ActiveField, true)
  } else if (branch.method !== method && active) {
    world.remove(field, ActiveField)
  }
}`,
	},
	"async-data": {
		en: [
			"Keep fetch and AbortController in an async adapter. Synchronous systems own loading, success, and error transitions.",
			"Store a requestId and ignore late responses whose ID no longer matches the active request.",
		],
		ru: [
			"Оставляйте fetch и AbortController в async adapter. Синхронные системы управляют loading, success и error transitions.",
			"Храните requestId и игнорируйте поздние ответы, чей ID больше не совпадает с активным запросом.",
		],
		code: `const receiveUsers: System<ResponseInput> = (world, input) => {
  const request = world.get(input.feature, RequestState)
  if (request?.requestId !== input.requestId) return

  world.run(replaceUsers, input.users)
  world.set(input.feature, RequestState, {
    phase: "success",
    requestId: input.requestId,
    error: null,
  })
}`,
	},
	crud: {
		en: [
			"Keep saved Customer data separate from CustomerDraft. The list reads saved data while the detail editor owns a reversible draft.",
			"Keep external IDs in scalar components. A unique secondary index provides lookup and rejects duplicates; delete systems still repair dependent state explicitly.",
		],
		ru: [
			"Разделяйте сохранённый Customer и CustomerDraft. Список читает saved data, а detail editor работает с отменяемым draft.",
			"Храните внешние ID в scalar components. Unique secondary index даёт lookup и запрещает дубликаты; delete systems явно восстанавливают зависимое состояние.",
		],
		code: `const CustomerId = defineComponent<string>("CustomerId")
const customersById = world.index(CustomerId, {
  unique: true,
})

const customer = world.spawn(
  [CustomerId, "customer-42"],
  [Customer, saved],
)

world.require(customer, Customer)
customersById.get("customer-42")`,
	},
	optimistic: {
		en: [
			"Apply the next value immediately and attach PendingMutation with the previous snapshot and a unique mutationId.",
			"Confirmation removes pending state. Rejection restores previous data only when its mutationId still matches.",
		],
		ru: [
			"Сразу применяйте новое значение и добавляйте PendingMutation с предыдущим snapshot и уникальным mutationId.",
			"Подтверждение удаляет pending state. Ошибка восстанавливает данные только при совпадении mutationId.",
		],
		code: `if (pending?.mutationId !== input.mutationId) return

world.set(input.customer, Customer, pending.previous)
world.remove(input.customer, PendingMutation)
world.set(input.customer, SaveError, {
  message: input.message,
})`,
	},
	toasts: {
		en: [
			"Represent every notification as an entity with Toast and ToastExpiry. Rendering becomes a simple query.",
			"Pass the current time into expireToasts so systems stay deterministic and tests need no real clock.",
		],
		ru: [
			"Представляйте каждое уведомление как entity с Toast и ToastExpiry. Рендеринг становится простым query.",
			"Передавайте текущее время в expireToasts, чтобы системы оставались детерминированными.",
		],
		code: `const expireToasts: System<{ now: number }> = (
  world,
  { now },
) => {
  for (const [toast, expiry] of world.query(ToastExpiry)) {
    if (expiry.expiresAt <= now) world.destroy(toast)
  }
}`,
	},
	modals: {
		en: [
			"Store which modal is active and its subject in ECS. Keep focus movement, Escape handling, and dialog semantics in React.",
			"Use a stable screen entity for one modal, or separate overlay entities when several may coexist.",
		],
		ru: [
			"Храните активное modal и его subject в ECS. Перемещение фокуса, Escape и dialog semantics оставляйте React.",
			"Используйте стабильную screen entity для одного modal или отдельные overlay entities для нескольких.",
		],
		code: `world.set(screen, ActiveModal, {
  kind: "delete-customer",
  subject: customer,
})

// React owns focus and DOM dialog behavior.
world.remove(screen, ActiveModal)`,
	},
	kanban: {
		en: [
			"Card content stays on the card entity. CardPlacement contains column entity and order, while DragSession is transient board state.",
			"Pointer hit testing becomes semantic overColumn and overIndex input. The drop system never needs DOM nodes.",
		],
		ru: [
			"Контент карточки остаётся на card entity. CardPlacement хранит column entity и order, а DragSession — временное состояние доски.",
			"Pointer hit testing превращается в overColumn и overIndex. Drop system не нужны DOM nodes.",
		],
		code: `world.set(card, CardPlacement, {
  column: input.overColumn,
  order: input.overIndex,
})
world.run(normalizeColumnOrder, {
  column: input.overColumn,
})
world.remove(board, DragSession)`,
	},
	"async-validation": {
		en: [
			"Attach request state to the field entity. Match both requestId and the value being checked before applying a response.",
			"Debounce belongs to the effect boundary; visible checking, valid, and invalid state belongs in ECS.",
		],
		ru: [
			"Прикрепляйте request state к field entity. Перед применением ответа сравнивайте и requestId, и проверяемое значение.",
			"Debounce находится на effect boundary, а checking, valid и invalid state — в ECS.",
		],
		code: `const current = world.get(field, FieldValue)
const validation = world.get(field, AsyncValidation)

if (
  validation?.requestId !== input.requestId ||
  current?.value !== input.value
) return`,
	},
	ownership: {
		en: [
			"Attach OwnedBy to every row, cell, or field when one world hosts multiple feature instances.",
			"Every selection, validation, draft, and cleanup query must filter by owner so feature A cannot mutate feature B.",
		],
		ru: [
			"Добавляйте OwnedBy к каждой строке, ячейке или полю, когда один world содержит несколько feature instances.",
			"Каждый query для selection, validation, drafts и cleanup фильтруется по owner.",
		],
		code: `const selected = world
  .query(SelectedCell, OwnedBy)
  .filter(([, , ownership]) => {
    return ownership.owner === table
  })`,
	},
	routing: {
		en: [
			"Treat the browser URL as external history state. An adapter parses location and runs a synchronous applyRoute system.",
			"Application navigation updates history and then applies the parsed route. Back and forward reuse the same system.",
		],
		ru: [
			"Рассматривайте URL как внешнее history state. Adapter разбирает location и запускает синхронную applyRoute system.",
			"Навигация обновляет history, затем применяет parsed route. Back и forward используют ту же систему.",
		],
		code: `window.addEventListener("popstate", () => {
  world.run(applyRoute, {
    router,
    route: parseLocation(window.location),
  })
})`,
	},
	permissions: {
		en: [
			"Translate roles and policy inputs into capability markers such as CanEdit, CanDelete, and CanApprove.",
			"React reads the capability it needs, and protected systems guard the same marker. The server remains the security boundary.",
		],
		ru: [
			"Преобразуйте roles и policy inputs в capability markers: CanEdit, CanDelete и CanApprove.",
			"React читает нужную capability, а защищённые системы проверяют тот же marker. Security boundary остаётся на сервере.",
		],
		code: `if (role === "admin") {
  world.set(customer, CanDelete, true)
} else {
  world.remove(customer, CanDelete)
}`,
	},
	recipes: {
		en: [
			"Reuse four shapes: markers for boolean capability, stable feature entities for screen state, entity IDs for relationships, and transient components for drafts or gestures.",
			"Separate authoritative, derived, and transient data before designing systems.",
		],
		ru: [
			"Переиспользуйте четыре формы: markers для возможностей, feature entities для состояния экрана, entity ID для связей и transient components для drafts или gestures.",
			"До проектирования систем разделите authoritative, derived и transient data.",
		],
		code: `const Expanded = defineComponent<true>("Expanded")
const OwnedBy = defineComponent<{ owner: Entity }>("OwnedBy")
const Draft = defineComponent<{ value: string }>("Draft")

world.set(panel, Expanded, true)
world.remove(panel, Expanded)`,
	},
	testing: {
		en: [
			"Test world semantics first, domain systems without React second, and browser wiring only where pointer, focus, or rendering matters.",
			"Name tests after the invariant: stale responses are ignored, filter changes clear selection, and inactive fields are omitted.",
		],
		ru: [
			"Сначала тестируйте world semantics, затем domain systems без React и только потом browser wiring для pointer, focus и rendering.",
			"Называйте тест по invariant: stale response ignored, filter clears selection, inactive fields omitted.",
		],
		code: `it("ignores an older response", () => {
  world.run(startRequest, { requestId: "new" })
  world.run(receiveUsers, {
    requestId: "old",
    users: staleUsers,
  })

  expect(world.query(UserRow)).toEqual([])
})`,
	},
	boundaries: {
		en: [
			"ECSplain is deliberately synchronous: no scheduler, automatic rollback, live queries, resource API, or cascade deletion.",
			"Secondary indexes provide lookup by complete component value, not relationship ownership. Async effects, derived state, and lifecycle rules remain explicit application responsibilities.",
		],
		ru: [
			"ECSplain намеренно синхронный: без scheduler, automatic rollback, live queries, resource API и cascade deletion.",
			"Secondary indexes дают lookup по полному значению компонента, но не ownership. Async effects, derived state и lifecycle rules остаются явной ответственностью приложения.",
		],
		code: `world.run(systemThatWritesThenThrows)

// Applied writes remain in the world.
// Subscribers are notified once.
// The original error is rethrown.`,
	},
	exercises: {
		en: [
			"Extend one invariant at a time: add Shift-range selection, a third form branch, stale-response protection, or OwnedBy for two forms.",
			"Every exercise should add data as a component, behavior as a system, and only the smallest React subscription needed to render it.",
		],
		ru: [
			"Расширяйте по одному invariant: Shift-range selection, третья ветка формы, stale-response protection или OwnedBy для двух форм.",
			"Каждое упражнение добавляет данные как component, поведение как system и минимальную React-подписку.",
		],
		code: `// Exercise: host two forms in one world.
const OwnedBy = defineComponent<{ owner: Entity }>("OwnedBy")

// 1. Attach owner to every field.
// 2. Scope active-field queries.
// 3. Prove form A cannot mutate form B.`,
	},
}

const scenarioTitles = {
	table: [
		"A data grid built from stable identities",
		"Таблица на стабильных идентичностях",
	],
	"dynamic-form": [
		"Structure is just another query",
		"Структура — это ещё один query",
	],
	"async-data": [
		"Keep asynchronous effects at the boundary",
		"Оставляйте async effects на границе",
	],
	crud: [
		"Normalize records, drafts, and relationships",
		"Разделяйте записи, drafts и relationships",
	],
	optimistic: [
		"Rollback is an explicit domain action",
		"Rollback — явное действие домена",
	],
	toasts: [
		"Short-lived UI can still be entity-driven",
		"Временный UI тоже может быть entity-driven",
	],
	modals: [
		"ECS owns intent; React owns the DOM",
		"ECS хранит intent, React управляет DOM",
	],
	kanban: [
		"Drag semantic state, not DOM nodes",
		"Перетаскивайте semantic state, а не DOM nodes",
	],
	"async-validation": [
		"Validate the exact value you requested",
		"Проверяйте именно запрошенное значение",
	],
	ownership: [
		"Scope every operation to its feature owner",
		"Ограничивайте операции владельцем feature",
	],
	routing: [
		"Bridge URL history through one adapter",
		"Свяжите URL history через один adapter",
	],
	permissions: [
		"Turn policy into capabilities",
		"Преобразуйте policy в capabilities",
	],
	recipes: [
		"A small vocabulary covers many interfaces",
		"Небольшой словарь покрывает много интерфейсов",
	],
	testing: [
		"Test invariants before rendering details",
		"Сначала тестируйте invariants",
	],
	boundaries: [
		"Know what the core deliberately does not do",
		"Знайте осознанные ограничения core",
	],
	exercises: [
		"Build confidence one invariant at a time",
		"Развивайте модель по одному invariant",
	],
}

for (const [id, scenario] of Object.entries(scenarioLessons)) {
	lessons[id] = {
		en: {
			eyebrow:
				id === "table" || id === "dynamic-form"
					? "Complete example"
					: id === "recipes" ||
							id === "testing" ||
							id === "boundaries" ||
							id === "exercises"
						? "Practice"
						: "Application scenario",
			title: scenarioTitles[id][0],
			subtitle: scenario.en[0],
			paragraphs: scenario.en,
			takeaways: scenario.en,
			code: scenario.code,
		},
		ru: {
			eyebrow:
				id === "table" || id === "dynamic-form"
					? "Готовый пример"
					: id === "recipes" ||
							id === "testing" ||
							id === "boundaries" ||
							id === "exercises"
						? "Практика"
						: "Прикладной сценарий",
			title: scenarioTitles[id][1],
			subtitle: scenario.ru[0],
			paragraphs: scenario.ru,
			takeaways: scenario.ru,
			code: scenario.code,
		},
	}
}
