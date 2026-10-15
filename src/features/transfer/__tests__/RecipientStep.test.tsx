import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { asCents } from "@/domain/money";
import type { Contact } from "@/domain/types";
import type { PaginatedList } from "@/lib/use-paginated-list";
import {
  installHttpAdapter,
  jsonResponse,
  networkError,
  readBody,
} from "@/test-utils/http-adapter";
import { renderWithStore } from "@/test-utils/render-with-store";
import { goToStep, setAmount, setRecipient } from "@/store/slices/transferSlice";
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

    it("hides the Other contacts group when every contact is a favorite", () => {
      mockContacts({ items: contacts.filter((contact) => contact.isFavorite) });
      renderStep();

      expect(screen.queryByRole("group", { name: "Other contacts" })).not.toBeInTheDocument();
    });

    it("asks for the first page with an empty search", () => {
      renderStep();
      expect(useContactsMock).toHaveBeenCalledWith("", undefined);
    });

    it("passes the scenario to the hook", () => {
      renderStep(undefined, "large");
      expect(useContactsMock).toHaveBeenCalledWith("", "large");
    });
  });

  describe("pagination", () => {
    it("shows Load more when there are more pages and asks for the next one", async () => {
      mockContacts({ hasMore: true });
      renderStep();

      await userEvent.click(screen.getByRole("button", { name: "Load more" }));
      expect(loadMore).toHaveBeenCalledTimes(1);
    });

    it("does not show Load more on the last page", () => {
      renderStep();
      expect(screen.queryByRole("button", { name: "Load more" })).not.toBeInTheDocument();
    });

    it("disables Load more while the next page loads", () => {
      mockContacts({ hasMore: true, isLoadingMore: true });
      renderStep();

      const button = screen.getByRole("button", { name: "Load more" });
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute("aria-busy", "true");
    });

    it("shows the error of a failed page and keeps the contacts and the button", () => {
      mockContacts({
        hasMore: true,
        loadMoreError: { code: "NETWORK_ERROR", message: "We couldn't reach the server." },
      });
      renderStep();

      expect(screen.getByRole("alert")).toHaveTextContent("We couldn't reach the server.");
      expect(screen.getAllByRole("radio")).toHaveLength(4);
      expect(screen.getByRole("button", { name: "Load more" })).toBeEnabled();
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

    it("sends a new search when the user types again after a pause", async () => {
      const user = setupUser();
      renderStep();
      const input = screen.getByLabelText("Search contacts");

      await user.type(input, "ana");
      act(() => {
        vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
      });
      await user.clear(input);
      await user.type(input, "luis");
      act(() => {
        vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
      });

      // Clearing the box and typing "luis" without a pause never searches for the empty text.
      expect(searchedQueries()).toEqual(["", "ana", "luis"]);
    });

    it("shows Searching… while waiting for the debounce and hides it afterwards", async () => {
      const user = setupUser();
      renderStep();
      expect(screen.queryByText("Searching…")).not.toBeInTheDocument();

      await user.type(screen.getByLabelText("Search contacts"), "ana");
      expect(screen.getByText("Searching…")).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
      });
      expect(screen.queryByText("Searching…")).not.toBeInTheDocument();
    });

    it("shows Searching… and keeps the current results while the request runs", () => {
      mockContacts({ isLoading: true });
      renderStep();

      expect(screen.getByText("Searching…")).toBeInTheDocument();
      expect(screen.getAllByRole("radio")).toHaveLength(4);
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

    it("changes the selection", async () => {
      const { store } = renderStep();
      await userEvent.click(screen.getByRole("radio", { name: /Ana García/ }));
      await userEvent.click(screen.getByRole("radio", { name: /Carlos Ruiz/ }));

      expect(store.getState().transfer.recipient).toBe("Carlos Ruiz");
      expect(screen.getByRole("radio", { name: /Ana García/ })).not.toBeChecked();
    });

    it("shows an already selected recipient (coming back to the step)", () => {
      const store = storeAtRecipientStep();
      store.dispatch(setRecipient("Luis Hernández"));
      renderStep(store);

      expect(screen.getByRole("radio", { name: /Luis Hernández/ })).toBeChecked();
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

      it("moves the selection to another contact with the same name", async () => {
        mockContacts({ items: sameName });
        renderStep();

        await userEvent.click(screen.getByRole("radio", { name: /5511110000/ }));
        await userEvent.click(screen.getByRole("radio", { name: /5522220000/ }));

        expect(screen.getByRole("radio", { name: /5522220000/ })).toBeChecked();
        expect(screen.getByRole("radio", { name: /5511110000/ })).not.toBeChecked();
      });

      it("shows the first match as selected when coming back to the step", () => {
        mockContacts({ items: sameName });
        const store = storeAtRecipientStep();
        store.dispatch(setRecipient("Sam Lee"));
        renderStep(store);

        const checked = screen
          .getAllByRole("radio")
          .filter((radio) => (radio as HTMLInputElement).checked);
        expect(checked).toHaveLength(1);
        expect(screen.getByRole("radio", { name: /5511110000/ })).toBeChecked();
      });
    });
  });

  describe("Continue button look", () => {
    it("is grey until a recipient is chosen, then blue", async () => {
      renderStep();
      const next = screen.getByRole("button", { name: "Continue" });
      expect(next).toHaveAttribute("aria-disabled", "true");

      await userEvent.click(screen.getByRole("radio", { name: /Ana García/ }));
      expect(next).not.toHaveAttribute("aria-disabled");
      expect(next).toHaveClass("bg-blue-600");
    });
  });

  describe("Continue", () => {
    it("asks for a recipient when none is selected", async () => {
      const { store } = renderStep();
      await userEvent.click(screen.getByRole("button", { name: "Continue" }));

      expect(screen.getByRole("alert")).toHaveTextContent("Choose a recipient.");
      expect(store.getState().transfer.step).toBe("recipient");
    });

    it("does not show the error before Continue is pressed", () => {
      renderStep();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
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

    it("the + button sits next to the search box, away from Continue", () => {
      renderStep();

      const plus = screen.getByRole("button", { name: "New contact" });
      expect(plus).toHaveTextContent("+");
      expect(plus).toHaveAttribute("aria-expanded", "false");
      expect(plus.parentElement).toContainElement(screen.getByLabelText("Search contacts"));
      expect(plus.parentElement).not.toContainElement(
        screen.getByRole("button", { name: "Continue" }),
      );
    });

    it("the + button toggles the form and shows it above the contact list", async () => {
      renderStep();
      await openForm();

      const plus = screen.getByRole("button", { name: "New contact" });
      expect(plus).toHaveAttribute("aria-expanded", "true");
      const form = screen.getByRole("heading", { name: "New contact" });
      const firstContact = screen.getAllByRole("radio")[0] as HTMLElement;
      expect(
        form.compareDocumentPosition(firstContact) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();

      await userEvent.click(plus);
      expect(screen.queryByRole("heading", { name: "New contact" })).not.toBeInTheDocument();
      expect(plus).toHaveAttribute("aria-expanded", "false");
    });

    it("Save contact is grey until the form is valid, then blue", async () => {
      renderStep();
      await openForm();
      const save = screen.getByRole("button", { name: "Save contact" });
      expect(save).toHaveAttribute("aria-disabled", "true");

      await fillForm("Pat Doe", "pat@example.com");
      expect(save).not.toHaveAttribute("aria-disabled");
      expect(save).toHaveClass("bg-blue-600");
    });

    it("opens and closes the form", async () => {
      renderStep();
      await openForm();

      await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
      expect(screen.queryByRole("heading", { name: "New contact" })).not.toBeInTheDocument();
    });

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

    it("sends isFavorite when the checkbox is checked", async () => {
      const bodies: unknown[] = [];
      restoreAdapter = installHttpAdapter((config) => {
        bodies.push(readBody(config));
        return jsonResponse(config, 201, {
          contact: {
            id: "contact-9",
            name: "Pedro Sol",
            phoneOrEmail: "pedro@example.com",
            isFavorite: true,
          },
        });
      });
      renderStep();

      await openForm();
      await fillForm("Pedro Sol", "pedro@example.com");
      await userEvent.click(screen.getByLabelText("Add to favorites"));
      await userEvent.click(screen.getByRole("button", { name: "Save contact" }));

      await screen.findByText(/Sending to:/);
      expect(bodies).toEqual([
        { name: "Pedro Sol", phoneOrEmail: "pedro@example.com", isFavorite: true },
      ]);
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

    it("rejects an invalid phone or email on blur", async () => {
      renderStep();

      await openForm();
      await userEvent.type(screen.getByLabelText("Email or phone"), "123");
      await userEvent.tab();

      expect(
        screen.getByText("Enter a valid email or a 10-digit phone number"),
      ).toBeInTheDocument();
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

    it("shows a network error and lets the user retry", async () => {
      restoreAdapter = installHttpAdapter((config) => networkError(config));
      renderStep();

      await openForm();
      await fillForm("Pedro Sol", "5511112222");
      await userEvent.click(screen.getByRole("button", { name: "Save contact" }));

      expect(await screen.findByText(/couldn't reach the server/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Save contact" })).toBeEnabled();
    });
  });
});
