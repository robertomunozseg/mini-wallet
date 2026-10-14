export const SCENARIO_HEADER = "x-mock-scenario";

export const SCENARIOS = [
  "success",
  "network_error",
  "insufficient_funds",
  "timeout",
  "unknown_error",
] as const;

export type Scenario = (typeof SCENARIOS)[number];

// Relative weights: success 60%, every other scenario 10%.
const WEIGHTS: Record<Scenario, number> = {
  success: 60,
  network_error: 10,
  insufficient_funds: 10,
  timeout: 10,
  unknown_error: 10,
};

function isScenario(value: string | null): value is Scenario {
  return SCENARIOS.some((scenario) => scenario === value);
}

// A valid x-mock-scenario header forces the scenario (used by tests and demos).
// Otherwise one is picked at random. `random` is injectable to keep this testable.
export function resolveScenario(
  request: Pick<Request, "headers">,
  random: () => number = Math.random,
): Scenario {
  const forced = request.headers.get(SCENARIO_HEADER)?.trim() ?? null;
  if (isScenario(forced)) return forced;

  const totalWeight = SCENARIOS.reduce((sum, scenario) => sum + WEIGHTS[scenario], 0);
  let roll = random() * totalWeight;
  for (const scenario of SCENARIOS) {
    roll -= WEIGHTS[scenario];
    if (roll < 0) return scenario;
  }
  return "success";
}

// GET /api/movements uses its own scenarios: an empty list or a server error.
export type MovementsScenario = "empty" | "error";

export function resolveMovementsScenario(
  request: Pick<Request, "headers">,
): MovementsScenario | null {
  const value = request.headers.get(SCENARIO_HEADER)?.trim();
  return value === "empty" || value === "error" ? value : null;
}
