/**
 * Human reviewers must be onboarded in the `Reviewer` table.
 * Production: only VC-accepted, verified, active reviewers are listed or auto-assigned.
 * Development: any active reviewer appears so local testing works without full onboarding flags.
 */
export function reviewerAssignableWhere(): {
  active: true
  verified?: true
  vcAccepted?: true
} {
  if (process.env.NODE_ENV === 'development') {
    return { active: true }
  }
  return { active: true, verified: true, vcAccepted: true }
}
