import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { asCents } from "@/domain/money";
import type { Contact } from "@/domain/types";
import type { PaginatedList } from "@/lib/use-paginated-list";
import { installHttpAdapter, jsonResponse, readBody } from "@/test-utils/http-adapter";
import { renderWithStore } from "@/test-utils/render-with-store";
import { goToStep, setAmount } from "@/store/slices/transferSlice";
import { makeStore } from "@/store/store";
import { RecipientStep } from "../components/RecipientStep";
import { SEARCH_DEBOUNCE_MS } from "../hooks/useRecipientStep";

const useContactsMock = vi.hoisted(() => vi.fn());
vi.mock("../hooks/useContacts", () => ({ useContacts: useContactsMock }));

const balanceCents = asCents(100_000);
const refetch = vi.fn();
const loadMore = vi.fn();

// What the server returns: favorites first, then by name.
const contacts: Contact[] = [
  { id: "contact-1", name: "Ana García", phoneOrEmail: "ana.garcia@example.com", isFavorite: true },
  { id: "contact-2", name: "Luis Hernández", phoneOrEmail: "5512345678", isFavorite: true },
  { id: "contact-3", name: "María López", phoneOrEmail: "5598765432", isFavorite: true },
  {
    id: "contact-4",
    name: "Carlos Ruiz",
    phoneOrEmail: "carlos.ruiz@example.com",
    isFavorite: false,
  },
];

const mockContacts = (state: Partial<PaginatedList<Contact>>) => {
  useContactsMock.mockReturnValue({
    items: contacts,
    isLoading: false,
    isLoadingMore: false,
    error: null,
    loadMoreError: null,
    hasMore: false,
    loadMore,
    refetch,
    ...state,
  } satisfies PaginatedList<Contact>);
};
// A store that already completed the amount step, like a real user reaching this step.
const storeAtRecipientStep = () => {
  const store = makeStore();
  store.dispatch(setAmount(asCents(5_000)));
  store.dispatch(goToStep("recipient"));
  return store;
};
const renderStep = (store = storeAtRecipientStep(), scenario?: "large") => {
  return renderWithStore(<RecipientStep balanceCents={balanceCents} scenario={scenario} />, store);
};
// Every query the component asked useContacts for, in order and without repeats.
const searchedQueries = (): string[] => {
  const queries = useContactsMock.mock.calls.map((call) => String(call[0]));
  return queries.filter((query, index) => index === 0 || query !== queries[index - 1]);
};
describe("RecipientStep", () => {
  let restoreAdapter = () => {};

  beforeEach(() => {
    refetch.mockReset();
    loadMore.mockReset();
    useContactsMock.mockReset();
    mockContacts({});
  });

  afterEach(() => {
    restoreAdapter();
    restoreAdapter = () => {};
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  describe("contact list", () => {
    it("groups the contacts under Favorites and Other contacts", () => {
      renderStep();

      const favorites = screen.getByRole("group", { name: "Favorites" });
      const others = screen.getByRole("group", { name: "Other contacts" });
      expect(within(favorites).getAllByRole("radio")).toHaveLength(3);
      expect(within(others).getAllByRole("radio")).toHaveLength(1);
    });
  });

  describe("pagination", () => {
    it("shows Load more when there are more pages and asks for the next one", async () => {
      mockContacts({ hasMore: true });
      renderStep();

      await userEvent.click(screen.getByRole("button", { name: "Load more" }));
      expect(loadMore).toHaveBeenCalledTimes(1);
    });
  });

  describe("search (debounced, on the server)", () => {
    // Fake timers only here: the debounce is about time.
    function setupUser() {
      vi.useFakeTimers();
      // Testing Library only knows how to wait with fake timers when it finds a `jest` global
      // (it would otherwise wait for a real timer that never fires). This is that minimum.
      vi.stubGlobal("jest", { advanceTimersByTime: (ms: number) => vi.advanceTimersByTime(ms) });
      // delay: null types without waiting between keys: fast typing.
      return userEvent.setup({ delay: null });
    }

    it("does not search while the user is typing", async () => {
      const user = setupUser();
      renderStep();

      await user.type(screen.getByLabelText("Search contacts"), "garcia");
      act(() => {
        vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS - 1);
      });

      expect(searchedQueries()).toEqual([""]);
    });

    it("searches once, with the final text, after the user stops typing", async () => {
      const user = setupUser();
      renderStep();

      await user.type(screen.getByLabelText("Search contacts"), "garcia");
      act(() => {
        vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
      });

      expect(searchedQueries()).toEqual(["", "garcia"]);
    });

    it("says nothing matched, with the searched text, when the server returns no contacts", async () => {
      const user = setupUser();
      mockContacts({ items: [] });
      renderStep();

      await user.type(screen.getByLabelText("Search contacts"), "zzz");
      act(() => {
        vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
      });

      expect(screen.getByText(/No contacts match/)).toHaveTextContent("zzz");
      expect(screen.queryByText("No contacts yet")).not.toBeInTheDocument();
    });
  });

  describe("selection", () => {
    it("selects a contact and stores its name as the recipient", async () => {
      const { store } = renderStep();
      await userEvent.click(screen.getByRole("radio", { name: /Ana García/ }));

      expect(store.getState().transfer.recipient).toBe("Ana García");
      expect(screen.getByRole("radio", { name: /Ana García/ })).toBeChecked();
      expect(screen.getByText(/Sending to:/)).toHaveTextContent("Ana García");
    });

    describe("two contacts with the same name", () => {
      const sameName: Contact[] = [
        { id: "a", name: "Sam Lee", phoneOrEmail: "5511110000", isFavorite: false },
        { id: "b", name: "Sam Lee", phoneOrEmail: "5522220000", isFavorite: false },
        { id: "c", name: "Sam Lee", phoneOrEmail: "5533330000", isFavorite: false },
      ];

      it("selects only the one the user clicked", async () => {
        mockContacts({ items: sameName });
        const { store } = renderStep();

        await userEvent.click(screen.getByRole("radio", { name: /5511110000/ }));

        expect(screen.getByRole("radio", { name: /5511110000/ })).toBeChecked();
        expect(screen.getByRole("radio", { name: /5522220000/ })).not.toBeChecked();
        expect(screen.getByRole("radio", { name: /5533330000/ })).not.toBeChecked();
        expect(store.getState().transfer.recipient).toBe("Sam Lee");
      });
    });
  });

  describe("Continue", () => {
    it("asks for a recipient when none is selected", async () => {
      const { store } = renderStep();
      await userEvent.click(screen.getByRole("button", { name: "Continue" }));

      expect(screen.getByRole("alert")).toHaveTextContent("Choose a recipient.");
      expect(store.getState().transfer.step).toBe("recipient");
    });

    it("goes to the summary with a recipient", async () => {
      const { store } = renderStep();
      await userEvent.click(screen.getByRole("radio", { name: /Ana García/ }));
      await userEvent.click(screen.getByRole("button", { name: "Continue" }));

      expect(store.getState().transfer.step).toBe("summary");
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  describe("states", () => {
    it("shows a loading state while the first page loads", () => {
      mockContacts({ items: [], isLoading: true });
      renderStep();

      expect(screen.getByRole("status")).toHaveTextContent("Loading contacts");
      expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    });

    it("shows an empty state when there are no contacts", () => {
      mockContacts({ items: [] });
      renderStep();

      expect(screen.getByText("No contacts yet")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "New contact" })).toBeInTheDocument();
    });

    it("shows an error with a retry button", async () => {
      mockContacts({
        items: [],
        error: { code: "NETWORK_ERROR", message: "We couldn't reach the server." },
      });
      renderStep();

      expect(screen.getByRole("alert")).toHaveTextContent("We couldn't load your contacts");
      await userEvent.click(screen.getByRole("button", { name: "Try again" }));
      expect(refetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("new contact", () => {
    // The form is loaded on demand (next/dynamic), so it appears a moment after the click.
    async function openForm() {
      await userEvent.click(screen.getByRole("button", { name: "New contact" }));
      await screen.findByRole("heading", { name: "New contact" });
    }

    async function fillForm(name: string, phoneOrEmail: string) {
      await userEvent.type(screen.getByLabelText("Name"), name);
      await userEvent.type(screen.getByLabelText("Email or phone"), phoneOrEmail);
    }

    it("creates the contact, selects it and reloads the list", async () => {
      const requests: unknown[] = [];
      restoreAdapter = installHttpAdapter((config) => {
        requests.push({ method: config.method, url: config.url, body: readBody(config) });
        return jsonResponse(config, 201, {
          contact: {
            id: "contact-9",
            name: "Pedro Sol",
            phoneOrEmail: "5511112222",
            isFavorite: false,
          },
        });
      });
      const { store } = renderStep();

      await openForm();
      await fillForm("Pedro Sol", "5511112222");
      await userEvent.click(screen.getByRole("button", { name: "Save contact" }));

      await screen.findByText(/Sending to:/);
      expect(requests).toEqual([
        {
          method: "post",
          url: "/contacts",
          body: { name: "Pedro Sol", phoneOrEmail: "5511112222", isFavorite: false },
        },
      ]);
      expect(store.getState().transfer.recipient).toBe("Pedro Sol");
      expect(screen.getByText(/Sending to:/)).toHaveTextContent("Pedro Sol");
      expect(refetch).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole("heading", { name: "New contact" })).not.toBeInTheDocument();
    });

    it("validates the fields and does not send an invalid contact", async () => {
      let requestCount = 0;
      restoreAdapter = installHttpAdapter((config) => {
        requestCount += 1;
        return jsonResponse(config, 201, {});
      });
      renderStep();

      await openForm();
      await userEvent.click(screen.getByRole("button", { name: "Save contact" }));

      expect(screen.getByLabelText("Name")).toHaveAttribute("aria-invalid", "true");
      expect(screen.getByLabelText("Email or phone")).toHaveAttribute("aria-invalid", "true");
      expect(screen.getByText("Name is required")).toBeInTheDocument();
      expect(requestCount).toBe(0);
    });

    it("shows the server message for a duplicate contact and keeps the form open", async () => {
      restoreAdapter = installHttpAdapter((config) =>
        jsonResponse(config, 400, {
          error: {
            code: "VALIDATION_ERROR",
            message: "A contact with this phone or email already exists.",
          },
        }),
      );
      const { store } = renderStep();

      await openForm();
      await fillForm("Another Luis", "5512345678");
      await userEvent.click(screen.getByRole("button", { name: "Save contact" }));

      const alert = await screen.findByText("A contact with this phone or email already exists.");
      expect(alert.closest("[role=alert]")).not.toBeNull();
      expect(screen.getByRole("heading", { name: "New contact" })).toBeInTheDocument();
      expect(store.getState().transfer.recipient).toBe("");
      expect(refetch).not.toHaveBeenCalled();
    });
  });
});
