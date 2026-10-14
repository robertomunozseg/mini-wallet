import {
  parseListScenario,
  SCENARIO_HEADER,
  SCENARIOS,
  type ListScenario,
  type Scenario,
} from "@/domain/api";

export { SCENARIOS };
export type { Scenario };

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

export function resolveListScenario(request: Pick<Request, "headers">): ListScenario | null {
  return parseListScenario(request.headers.get(SCENARIO_HEADER));
}
