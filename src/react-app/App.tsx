import { SignIn, UserButton, useAuth } from "@clerk/react"
import "./App.css"
import { AuthGate } from "./auth/auth-gate"

function LoadingScreen() {
	return (
		<main className="auth-screen" aria-live="polite">
			<p>セッションを確認しています</p>
		</main>
	)
}

function SignInScreen() {
	return (
		<main className="auth-screen">
			<header className="auth-heading">
				<p className="eyebrow">Budget App</p>
				<h1>家計簿</h1>
				<p>Googleアカウントでログインして、毎月の支出と予算を管理します。</p>
			</header>
			<SignIn routing="hash" />
		</main>
	)
}

function AuthenticatedApp() {
	return (
		<main className="app-shell">
			<header className="app-header">
				<div>
					<p className="eyebrow">Budget App</p>
					<h1>家計簿</h1>
				</div>
				<UserButton />
			</header>
			<section className="placeholder" aria-labelledby="welcome-heading">
				<h2 id="welcome-heading">ログインしました</h2>
				<p>家計簿の初期設定は次のステップで行います。</p>
			</section>
		</main>
	)
}

function App() {
	const { isLoaded, isSignedIn } = useAuth()

	return (
		<AuthGate
			isLoaded={isLoaded}
			isSignedIn={isSignedIn}
			loading={<LoadingScreen />}
			signedOut={<SignInScreen />}
		>
			<AuthenticatedApp />
		</AuthGate>
	)
}

export default App
