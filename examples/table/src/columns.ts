import type {
	ColumnKey,
	Role,
	Status,
	TableColumnData,
	UserRowData,
} from "./model"

interface CommitSuccess {
	readonly ok: true
	readonly row: UserRowData
}

interface CommitFailure {
	readonly ok: false
	readonly error: string
}

type CommitResult = CommitSuccess | CommitFailure

export interface ColumnBehavior {
	read(row: Readonly<UserRowData>): string
	commit(row: Readonly<UserRowData>, draft: string): CommitResult
}

export const roles: readonly Role[] = ["Admin", "Editor", "Viewer"]
export const statuses: readonly Status[] = ["Active", "Inactive"]

export const columnDefinitions: readonly TableColumnData[] = [
	{
		key: "name",
		label: "Name",
		control: { type: "text" },
		order: 0,
		visible: true,
	},
	{
		key: "email",
		label: "Email",
		control: { type: "text" },
		order: 1,
		visible: true,
	},
	{
		key: "role",
		label: "Role",
		control: { type: "select", options: roles },
		order: 2,
		visible: true,
	},
	{
		key: "status",
		label: "Status",
		control: { type: "select", options: statuses },
		order: 3,
		visible: true,
	},
]

function textCommit(
	row: Readonly<UserRowData>,
	key: "name" | "email",
	draft: string,
): CommitResult {
	const value = draft.trim()

	if (value.length === 0) {
		return { ok: false, error: "This value is required." }
	}
	if (key === "email" && !value.includes("@")) {
		return { ok: false, error: "Enter an email containing @." }
	}

	return { ok: true, row: { ...row, [key]: value } }
}

function optionCommit<Option extends string>(
	row: Readonly<UserRowData>,
	key: "role" | "status",
	draft: string,
	options: readonly Option[],
): CommitResult {
	const value = options.find(option => option === draft)
	if (value === undefined) {
		return { ok: false, error: "Choose one of the available values." }
	}

	return { ok: true, row: { ...row, [key]: value } }
}

export const columnBehaviors: Readonly<Record<ColumnKey, ColumnBehavior>> = {
	name: {
		read: row => row.name,
		commit: (row, draft) => textCommit(row, "name", draft),
	},
	email: {
		read: row => row.email,
		commit: (row, draft) => textCommit(row, "email", draft),
	},
	role: {
		read: row => row.role,
		commit: (row, draft) => optionCommit(row, "role", draft, roles),
	},
	status: {
		read: row => row.status,
		commit: (row, draft) => optionCommit(row, "status", draft, statuses),
	},
}
