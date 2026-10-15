import {
  parseListScenario,
  SCENARIO_HEADER,
  SCENARIOS,
  type ListScenario,
  type Scenario,
} from "@/domain/api";

export { SCENARIOS };
export type { Scenario };

// Chances for each scenario: success 60%, every other one 10%.
const WEIGHTS: Record<Scenario, number> = {
  success: 60,
  network_error: 10,
  insufficient_funds: 10,
  timeout: 10,
  unknown_error: 10,
};

const isScenario = (value: string | null): value is Scenario =>
  SCENARIOS.some((scenario) => scenario === value);

// The x-mock-scenario header forces a scenario (tests and demos use it). Without it, one is
// picked at random. `random` can be replaced so the draw is testable.
export const resolveScenario = (
  request: Pick<Request, "headers">,
  random: () => number = Math.random,
): Scenario => {
  const forced = request.headers.get(SCENARIO_HEADER)?.trim() ?? null;
  if (isScenario(forced)) return forced;

  const totalWeight = SCENARIOS.reduce((sum, scenario) => sum + WEIGHTS[scenario], 0);
  let roll = random() * totalWeight;
  for (const scenario of SCENARIOS) {
    roll -= WEIGHTS[scenario];
    if (roll < 0) return scenario;
  }
  return "success";
};

export const resolveListScenario = (request: Pick<Request, "headers">): ListScenario | null =>
  parseListScenario(request.headers.get(SCENARIO_HEADER));
