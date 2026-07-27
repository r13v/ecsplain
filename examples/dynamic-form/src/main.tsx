import { WorldProvider } from "ecsplain/react"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { App } from "./App"
import { createFormExample } from "./bootstrap"
import "./styles.css"

const rootElement = document.getElementById("root")
if (rootElement === null) {
	throw new Error("The dynamic form example requires a #root element")
}

const example = createFormExample()

createRoot(rootElement).render(
	<StrictMode>
		<WorldProvider world={example.world}>
			<App form={example.form} />
		</WorldProvider>
	</StrictMode>,
)
