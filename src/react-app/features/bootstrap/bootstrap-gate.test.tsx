// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { BootstrapGate } from "./bootstrap-gate"

function renderGate(bootstrap: () => Promise<true>) {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
	return render(
		<QueryClientProvider client={queryClient}>
			<BootstrapGate userId="user_1" bootstrap={bootstrap}>
				<p>家計簿本体</p>
			</BootstrapGate>
		</QueryClientProvider>,
	)
}

describe("BootstrapGate", () => {
	it("does not mount the application before bootstrap succeeds", async () => {
		// Arrange
		const bootstrap = vi.fn<() => Promise<true>>().mockResolvedValue(true)

		// Act
		renderGate(bootstrap)

		// Assert
		expect(screen.getByRole("status")).toHaveTextContent("家計簿を準備しています")
		expect(screen.queryByText("家計簿本体")).not.toBeInTheDocument()

		// Assert
		expect(await screen.findByText("家計簿本体")).toBeInTheDocument()
	})

	it("lets the user retry a failed bootstrap", async () => {
		// Arrange
		const user = userEvent.setup()
		const bootstrap = vi
			.fn<() => Promise<true>>()
			.mockRejectedValueOnce(new TypeError("failed"))
			.mockResolvedValueOnce(true)
		renderGate(bootstrap)
		const retryButton = await screen.findByRole("button", { name: "もう一度試す" })

		// Act
		await user.click(retryButton)

		// Assert
		expect(await screen.findByText("家計簿本体")).toBeInTheDocument()
		expect(bootstrap).toHaveBeenCalledTimes(2)
	})
})
