import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { AuthGate } from "./auth-gate"

describe("AuthGate", () => {
	it("shows only the loading state while Clerk restores the session", () => {
		// Arrange
		const expected = "セッションを確認しています"

		// Act
		const html = renderToStaticMarkup(
			<AuthGate
				isLoaded={false}
				isSignedIn={undefined}
				loading={<p>{expected}</p>}
				signedOut={<p>ログイン</p>}
			>
				<p>家計簿</p>
			</AuthGate>,
		)

		// Assert
		expect(html).toContain(expected)
		expect(html).not.toContain("ログイン")
		expect(html).not.toContain("家計簿")
	})

	it("shows only the sign-in screen after restoring an anonymous session", () => {
		// Arrange
		const expected = "Googleでログイン"

		// Act
		const html = renderToStaticMarkup(
			<AuthGate
				isLoaded={true}
				isSignedIn={false}
				loading={<p>セッションを確認しています</p>}
				signedOut={<p>{expected}</p>}
			>
				<p>家計簿</p>
			</AuthGate>,
		)

		// Assert
		expect(html).toContain(expected)
		expect(html).not.toContain("セッションを確認しています")
		expect(html).not.toContain("家計簿")
	})

	it("shows only the application for an authenticated session", () => {
		// Arrange
		const expected = "家計簿"

		// Act
		const html = renderToStaticMarkup(
			<AuthGate
				isLoaded={true}
				isSignedIn={true}
				loading={<p>セッションを確認しています</p>}
				signedOut={<p>Googleでログイン</p>}
			>
				<p>{expected}</p>
			</AuthGate>,
		)

		// Assert
		expect(html).toContain(expected)
		expect(html).not.toContain("セッションを確認しています")
		expect(html).not.toContain("Googleでログイン")
	})
})
