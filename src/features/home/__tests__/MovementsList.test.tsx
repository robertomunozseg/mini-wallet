import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { asCents } from "@/domain/money";
import type { Movement } from "@/domain/types";
import { MovementsList } from "../components/MovementsList";

const useMovementsMock = vi.hoisted(() => vi.fn());
vi.mock("../hooks/useMovements", () => ({ useMovements: useMovementsMock }));

const refetch = vi.fn();

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

function mockHook(state: {
  movements?: Movement[] | null;
  isLoading?: boolean;
  error?: { code: string; message: string } | null;
}) {
  useMovementsMock.mockReturnValue({
    movements: null,
    isLoading: false,
    error: null,
    refetch,
    ...state,
  });
}

describe("MovementsList", () => {
  beforeEach(() => {
    refetch.mockReset();
    useMovementsMock.mockReset();
  });

  it("shows a loading state while fetching", () => {
    mockHook({ isLoading: true });
    render(<MovementsList />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading movements");
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.queryByText("No movements yet")).not.toBeInTheDocument();
  });

  it("shows an empty state when there are no movements", () => {
    mockHook({ movements: [] });
    render(<MovementsList />);

    expect(screen.getByText("No movements yet")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("treats a missing list as empty, not as loading", () => {
    mockHook({ movements: null });
    render(<MovementsList />);

    expect(screen.getByText("No movements yet")).toBeInTheDocument();
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

    it("does not show the list or the empty state", () => {
      mockHook({ error: { code: "UNKNOWN_ERROR", message: "Something went wrong." } });
      render(<MovementsList />);

      expect(screen.queryByRole("list")).not.toBeInTheDocument();
      expect(screen.queryByText("No movements yet")).not.toBeInTheDocument();
    });
  });

  describe("list state", () => {
    it("renders one item per movement", () => {
      mockHook({ movements });
      render(<MovementsList />);

      expect(screen.getAllByRole("listitem")).toHaveLength(2);
      expect(screen.getByText("+$3,500.00")).toBeInTheDocument();
      expect(screen.getByText("-$1,200.50")).toBeInTheDocument();
    });

    it("has a heading", () => {
      mockHook({ movements });
      render(<MovementsList />);
      expect(screen.getByRole("heading", { name: "Recent movements" })).toBeInTheDocument();
    });
  });

  it("passes the scenario to the hook", () => {
    mockHook({ movements });
    render(<MovementsList scenario="empty" />);
    expect(useMovementsMock).toHaveBeenCalledWith("empty");
  });
});
