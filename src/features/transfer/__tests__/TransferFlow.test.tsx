import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { asCents } from "@/domain/money";
import { installHttpAdapter, jsonResponse, networkError } from "@/test-utils/http-adapter";
import { renderWithStore } from "@/test-utils/render-with-store";
import { goToStep, setAmount, setRecipient } from "@/store/slices/transferSlice";
import { makeStore } from "@/store/store";
import { TransferFlow } from "../components/TransferFlow";

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const useContactsMock = vi.hoisted(() => vi.fn());
vi.mock("../hooks/useContacts", () => ({ useContacts: useContactsMock }));

const balanceCents = asCents(100_000);

const currentStep = (): string => {
  const current = screen.getByRole("listitem", { current: "step" });
  return current.textContent ?? "";
};
describe("TransferFlow", () => {
  beforeEach(() => {
    router.push.mockReset();
    useContactsMock.mockReturnValue({
      items: [
        { id: "1", name: "Ana García", phoneOrEmail: "ana.garcia@example.com", isFavorite: true },
      ],
      isLoading: false,
      isLoadingMore: false,
      error: null,
      loadMoreError: null,
      hasMore: false,
      loadMore: vi.fn(),
      refetch: vi.fn(),
    });
  });

  it("walks through amount, recipient and summary", async () => {
    renderWithStore(<TransferFlow balanceCents={balanceCents} />);

    await userEvent.type(screen.getByLabelText("Amount (MXN)"), "50");
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("heading", { name: "Who is receiving it?" })).toBeVisible();
    expect(currentStep()).toContain("Recipient");

    await userEvent.click(screen.getByRole("radio", { name: /Ana García/ }));
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("heading", { name: "Review your transfer" })).toBeVisible();
    expect(currentStep()).toContain("Summary");
    expect(screen.getByText("$950.00")).toBeInTheDocument();
  });

  describe("Back", () => {
    it("leaves the flow to /home from the first step", async () => {
      renderWithStore(<TransferFlow balanceCents={balanceCents} />);
      await userEvent.click(screen.getByRole("button", { name: /Back/ }));

      expect(router.push).toHaveBeenCalledWith("/home");
    });

    it("goes back one step and keeps what the user entered", async () => {
      const { store } = renderWithStore(<TransferFlow balanceCents={balanceCents} />);
      await userEvent.type(screen.getByLabelText("Amount (MXN)"), "50");
      await userEvent.click(screen.getByRole("button", { name: "Continue" }));

      await userEvent.click(screen.getByRole("button", { name: /Back/ }));

      expect(store.getState().transfer.step).toBe("amount");
      expect(screen.getByLabelText("Amount (MXN)")).toHaveValue("50.00");
      expect(router.push).not.toHaveBeenCalled();
    });
  });

  describe("leaving the flow", () => {
    it("resets the draft when the flow unmounts", () => {
      const store = makeStore();
      store.dispatch(setAmount(asCents(5_000)));
      store.dispatch(setRecipient("Ana García"));
      store.dispatch(goToStep("summary"));
      const { unmount } = renderWithStore(<TransferFlow balanceCents={balanceCents} />, store);

      unmount();

      expect(store.getState().transfer).toEqual({
        step: "amount",
        amountCents: null,
        recipient: "",
        idempotencyKey: null,
        demoScenario: "random",
      });
    });
  });

  describe("confirmation", () => {
    function storeAtSummary() {
      const store = makeStore();
      store.dispatch(setAmount(asCents(5_000)));
      store.dispatch(setRecipient("Ana García"));
      store.dispatch(goToStep("summary"));
      return store;
    }

    const receipt = {
      transaction: {
        id: "tx-1",
        amountCents: 5_000,
        recipient: "Ana García",
        createdAt: "2026-10-14T12:00:00.000Z",
        status: "completed",
      },
      newBalanceCents: 95_000,
    };

    let restore = () => {};
    afterEach(() => {
      restore();
    });

    it("confirms, shows the result and keeps the Summary step highlighted", async () => {
      restore = installHttpAdapter((config) => networkError(config));
      renderWithStore(<TransferFlow balanceCents={balanceCents} />, storeAtSummary());

      await userEvent.click(screen.getByRole("button", { name: "Confirm" }));

      expect(await screen.findByRole("button", { name: "Try again" })).toBeVisible();
      expect(currentStep()).toContain("Summary");
    });

    it("retries with the same key and opens the receipt", async () => {
      let calls = 0;
      restore = installHttpAdapter((config) => {
        calls += 1;
        return calls === 1 ? networkError(config) : jsonResponse(config, 201, { receipt });
      });
      renderWithStore(<TransferFlow balanceCents={balanceCents} />, storeAtSummary());

      await userEvent.click(screen.getByRole("button", { name: "Confirm" }));
      await userEvent.click(await screen.findByRole("button", { name: "Try again" }));

      await waitFor(() => expect(router.push).toHaveBeenCalledWith("/transfer/receipt/tx-1"));
    });

    it("Change amount goes back to the amount step with a new key", async () => {
      restore = installHttpAdapter((config) =>
        jsonResponse(config, 422, { error: { code: "INSUFFICIENT_FUNDS", message: "x" } }),
      );
      const store = storeAtSummary();
      renderWithStore(<TransferFlow balanceCents={balanceCents} />, store);

      await userEvent.click(screen.getByRole("button", { name: "Confirm" }));
      await userEvent.click(await screen.findByRole("button", { name: "Change amount" }));

      expect(store.getState().transfer.step).toBe("amount");
      expect(store.getState().transfer.idempotencyKey).toBeNull();
      expect(screen.getByLabelText("Amount (MXN)")).toHaveValue("50.00");
    });
  });
});
