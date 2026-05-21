/** True for `/login`, `/login/`, or nested variants like `/MyApp/login/`. */
export function isLoginPathname(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const trimmed = pathname.replace(/\/+$/, "") || "/";
  if (trimmed === "/login") return true;
  return trimmed.endsWith("/login");
}
