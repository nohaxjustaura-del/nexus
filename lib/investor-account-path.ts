/**
 * Signed-in investor / VC product routes (`/investor/...`, `/vc/...`).
 * Must not use `pathname.startsWith('/investor')` alone — that matches public
 * firm profiles at `/investors/...`.
 */
export function isInvestorAccountAreaPath(pathname: string): boolean {
  if (pathname.startsWith('/vc')) return true
  return pathname === '/investor' || pathname.startsWith('/investor/')
}
