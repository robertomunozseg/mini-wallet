import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { asCents } from "@/domain/money";
import { renderWithStore } from "@/test-utils/render-with-store";
import { goToStep, setAmount, setRecipient, startConfirm } from "@/store/slices/transferSlice";
import { makeStore } from "@/store/store";
import { TransferFlow } from "../components/TransferFlow";

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const useContactsMock = vi.hoisted(() => vi.fn());
vi.mock("../hooks/useContacts", () => ({ useContacts: useContactsMock }));

const balanceCents = asCents(100_000);

function currentStep(): string {
  const current = screen.getByRole("listitem", { current: "step" });
  return current.textContent ?? "";
}

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

  it("starts at the amount step", () => {
    renderWithStore(<TransferFlow balanceCents={balanceCents} />);

    expect(screen.getByRole("heading", { name: "How much do you want to send?" })).toBeVisible();
    expect(currentStep()).toContain("Amount");
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

    it("goes from the summary back to the recipient with the contact still selected", async () => {
      const store = makeStore();
      store.dispatch(setAmount(asCents(5_000)));
      store.dispatch(setRecipient("Ana García"));
      store.dispatch(goToStep("summary"));
      renderWithStore(<TransferFlow balanceCents={balanceCents} />, store);

      await userEvent.click(screen.getByRole("button", { name: /Back/ }));

      expect(screen.getByRole("radio", { name: /Ana García/ })).toBeChecked();
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
        lastResult: null,
      });
    });
  });

  describe("confirmation placeholder", () => {
    function storeConfirming() {
      const store = makeStore();
      store.dispatch(setAmount(asCents(5_000)));
      store.dispatch(setRecipient("Ana García"));
      store.dispatch(startConfirm());
      return store;
    }

    it("shows a temporary message and keeps the Summary step highlighted", () => {
      renderWithStore(<TransferFlow balanceCents={balanceCents} />, storeConfirming());

      expect(screen.getByRole("status")).toHaveTextContent(
        "Confirmation arrives in the next phase",
      );
      expect(currentStep()).toContain("Summary");
    });

    it("goes back to the summary keeping the idempotency key", async () => {
      const store = storeConfirming();
      const key = store.getState().transfer.idempotencyKey;
      renderWithStore(<TransferFlow balanceCents={balanceCents} />, store);

      await userEvent.click(screen.getByRole("button", { name: /Back/ }));

      expect(store.getState().transfer.step).toBe("summary");
      expect(store.getState().transfer.idempotencyKey).toBe(key);
    });
  });
});
