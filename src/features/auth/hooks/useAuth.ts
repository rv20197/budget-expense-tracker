// TODO: This hook is a stub and is not currently used anywhere in the codebase.
// Auth is entirely server-side (JWT in httpOnly cookies verified in Server Actions
// and middleware). If client components ever need to know the current user's identity
// without a server round-trip, implement this by adding a React context/provider
// that is populated from a server-fetched session (e.g. via a /api/auth/me route
// or by passing session data down from a Server Component via props/context).
export function useAuth() {
  return {
    isAuthenticated: false,
    user: null,
  };
}
