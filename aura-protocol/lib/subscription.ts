// lib/subscription.ts
export function getProtocolStatus(trialEndsAt: string | null) {
  if (!trialEndsAt) return "active";

  const now = new Date();
  const expiry = new Date(trialEndsAt);
  
  // 2-day grace period window after the initial 7 days
  const gracePeriodEnd = new Date(expiry);
  gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 2);

  if (now <= expiry) {
    return "active"; // Days 1-7: Clean access
  } else if (now > expiry && now <= gracePeriodEnd) {
    return "grace";  // Days 8-9: Soft warning, fully bypassable
  } else {
    return "locked"; // Day 10+: Full renewal paywall lock
  }
}
