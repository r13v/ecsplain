import { WorldProvider } from "ecsplain/react"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { App } from "./App"
import { createTableExample } from "./bootstrap"
import "./styles.css"

const rootElement = document.getElementById("root")
if (rootElement === null) {
	throw new Error("The table example requires a #root element")
}

const example = createTableExample()

createRoot(rootElement).render(
	<StrictMode>
		<WorldProvider world={example.world}>
			<App table={example.table} />
		</WorldProvider>
	</StrictMode>,
)
