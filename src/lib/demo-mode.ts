// NEXT_PUBLIC_* variables are fixed at build time. With NEXT_PUBLIC_DEMO_MODE=true the transfer
// summary shows a selector to force a simulated scenario, so every case can be seen.
export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}
