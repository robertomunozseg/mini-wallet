import type { ListScenario } from "@/domain/api";
import { DEFAULT_PAGE_SIZE } from "@/domain/pagination";
import { list } from "@/server/services/movementService";
import { MovementsList } from "./MovementsList";

type MovementsSectionProps = { scenario?: ListScenario };

// Server Component: it loads the first page of movements on the server, so the HTML already has
// the first rows and the browser does not wait for the JavaScript to start a request.
// Inside <Suspense> this section can stream in after the rest of the page.
export async function MovementsSection({ scenario }: MovementsSectionProps) {
  const result = list({ limit: DEFAULT_PAGE_SIZE, scenario });

  // If it fails (e.g. ?scenario=error) the list loads itself on the client, which shows the
  // error with a retry button.
  const initialPage = result.ok ? result.value : undefined;

  // The key resets the list when the scenario in the URL changes.
  return (
    <MovementsList key={scenario ?? "default"} scenario={scenario} initialPage={initialPage} />
  );
}
