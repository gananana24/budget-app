import type { ReactNode } from "react"

type AuthGateProps = Readonly<{
	isLoaded: boolean
	isSignedIn: boolean | undefined
	loading: ReactNode
	signedOut: ReactNode
	children: ReactNode
}>

export function AuthGate({ isLoaded, isSignedIn, loading, signedOut, children }: AuthGateProps) {
	if (!isLoaded) {
		return loading
	}

	if (!isSignedIn) {
		return signedOut
	}

	return children
}
