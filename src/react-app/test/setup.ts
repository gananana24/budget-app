import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import { afterEach } from "vitest"

if (typeof Element !== "undefined" && !Element.prototype.scrollIntoView) {
	Element.prototype.scrollIntoView = () => {}
}
if (typeof window !== "undefined") {
	window.scrollTo = () => {}
}

afterEach(() => {
	cleanup()
})
