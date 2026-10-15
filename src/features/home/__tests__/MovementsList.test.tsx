import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { asCents } from "@/domain/money";
import type { Movement } from "@/domain/types";
import type { PaginatedList } from "@/lib/use-paginated-list";
import { MovementsList } from "../components/MovementsList";

const useMovementsMock = vi.hoisted(() => vi.fn());
vi.mock("../hooks/useMovements", () => ({ useMovements: useMovementsMock }));

// jsdom has no layout; these sizes play the role of the browser for the virtualized list.
beforeAll(() => {
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(function (
    this: HTMLElement,
  ) {
    // Only the scroll area is tall; a row is as tall as a row.
    return this.getAttribute("role") === "region" ? 480 : 73;
  });
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(600);
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
    () =>
      ({
        width: 600,
        height: 73,
        top: 0,
        left: 0,
        right: 600,
        bottom: 73,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect,
  );
});

afterAll(() => {
  vi.restoreAllMocks();
});

const refetch = vi.fn();
const loadMore = vi.fn();

const movements: Movement[] = [
  {
    id: "mov-1",
    type: "incoming",
    amountCents: asCents(350_000),
    counterpartName: "Payroll",
    createdAt: "2026-10-01T09:00:00.000Z",
    status: "completed",
  },
  {
    id: "mov-2",
    type: "outgoing",
    amountCents: asCents(120_050),
    counterpartName: "Ana García",
    createdAt: "2026-10-02T14:30:00.000Z",
    status: "completed",
  },
];

const mockHook = (state: Partial<PaginatedList<Movement>>) => {
  useMovementsMock.mockReturnValue({
    items: [],
    isLoading: false,
    isLoadingMore: false,
    error: null,
    loadMoreError: null,
    hasMore: false,
    loadMore,
    refetch,
    ...state,
  } satisfies PaginatedList<Movement>);
};
describe("MovementsList", () => {
  beforeEach(() => {
    refetch.mockReset();
    loadMore.mockReset();
    useMovementsMock.mockReset();
  });

  it("shows a loading state while the first page loads", () => {
    mockHook({ isLoading: true });
    render(<MovementsList />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading movements");
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.queryByText("No movements yet")).not.toBeInTheDocument();
  });

  it("shows an empty state when there are no movements", () => {
    mockHook({ items: [] });
    render(<MovementsList />);

    expect(screen.getByText("No movements yet")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  describe("error state", () => {
    it("shows the error in an alert", () => {
      mockHook({ error: { code: "NETWORK_ERROR", message: "We couldn't reach the server." } });
      render(<MovementsList />);

      const alert = screen.getByRole("alert");
      expect(alert).toHaveTextContent("We couldn't load your movements");
      expect(alert).toHaveTextContent("We couldn't reach the server.");
    });

    it("refetches when Try again is clicked", async () => {
      mockHook({ error: { code: "UNKNOWN_ERROR", message: "Something went wrong." } });
      render(<MovementsList />);

      await userEvent.click(screen.getByRole("button", { name: "Try again" }));
      expect(refetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("list state", () => {
    it("renders one item per movement", () => {
      mockHook({ items: movements });
      render(<MovementsList />);

      expect(screen.getAllByRole("listitem")).toHaveLength(2);
      expect(screen.getByText("+$3,500.00")).toBeInTheDocument();
      expect(screen.getByText("-$1,200.50")).toBeInTheDocument();
    });

    it("keeps the loaded items when a later page fails", () => {
      mockHook({
        items: movements,
        hasMore: true,
        loadMoreError: { code: "NETWORK_ERROR", message: "We couldn't reach the server." },
      });
      render(<MovementsList />);

      expect(screen.getByText("Payroll")).toBeInTheDocument();
      expect(screen.getByText("We couldn't reach the server.")).toBeInTheDocument();
    });
  });
});
