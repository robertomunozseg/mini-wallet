import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { asCents } from "@/domain/money";
import type { Contact } from "@/domain/types";
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

const useContactsMock = vi.hoisted(() => vi.fn());
vi.mock("../hooks/useContacts", () => ({ useContacts: useContactsMock }));

const balanceCents = asCents(100_000);
const refetch = vi.fn();

const contacts: Contact[] = [
  {
    id: "contact-4",
    name: "Carlos Ruiz",
    phoneOrEmail: "carlos.ruiz@example.com",
    isFavorite: false,
  },
  { id: "contact-3", name: "María López", phoneOrEmail: "5598765432", isFavorite: true },
  { id: "contact-1", name: "Ana García", phoneOrEmail: "ana.garcia@example.com", isFavorite: true },
  { id: "contact-2", name: "Luis Hernández", phoneOrEmail: "5512345678", isFavorite: true },
];

function mockContacts(state: {
  contacts?: Contact[] | null;
  isLoading?: boolean;
  error?: { code: string; message: string } | null;
}) {
  useContactsMock.mockReturnValue({
    contacts: contacts,
    isLoading: false,
    error: null,
    refetch,
    ...state,
  });
}

// A store that already completed the amount step, like a real user reaching this step.
function storeAtRecipientStep() {
  const store = makeStore();
  store.dispatch(setAmount(asCents(5_000)));
  store.dispatch(goToStep("recipient"));
  return store;
}

function radioNames(): string[] {
  return screen.getAllByRole("radio").map((radio) => radio.closest("label")?.textContent ?? "");
}

describe("RecipientStep", () => {
  let restoreAdapter = () => {};

  beforeEach(() => {
    refetch.mockReset();
    useContactsMock.mockReset();
    mockContacts({});
  });

  afterEach(() => {
    restoreAdapter();
    restoreAdapter = () => {};
  });

  describe("contact list", () => {
    it("shows favorites first, then the rest, each sorted by name", () => {
      renderWithStore(<RecipientStep balanceCents={balanceCents} />, storeAtRecipientStep());

      const names = radioNames();
      expect(names[0]).toContain("Ana García");
      expect(names[1]).toContain("Luis Hernández");
      expect(names[2]).toContain("María López");
      expect(names[3]).toContain("Carlos Ruiz");
    });

    it("groups the contacts under Favorites and All contacts", () => {
      renderWithStore(<RecipientStep balanceCents={balanceCents} />, storeAtRecipientStep());

      const favorites = screen.getByRole("group", { name: "Favorites" });
      const others = screen.getByRole("group", { name: "All contacts" });
      expect(within(favorites).getAllByRole("radio")).toHaveLength(3);
      expect(within(others).getAllByRole("radio")).toHaveLength(1);
    });

    it("hides the All contacts group when every contact is a favorite", () => {
      mockContacts({ contacts: contacts.filter((contact) => contact.isFavorite) });
      renderWithStore(<RecipientStep balanceCents={balanceCents} />, storeAtRecipientStep());

      expect(screen.queryByRole("group", { name: "All contacts" })).not.toBeInTheDocument();
    });
  });

  describe("search", () => {
    it("filters by name ignoring accents", async () => {
      renderWithStore(<RecipientStep balanceCents={balanceCents} />, storeAtRecipientStep());
      await userEvent.type(screen.getByLabelText("Search contacts"), "garcia");

      expect(screen.getAllByRole("radio")).toHaveLength(1);
      expect(screen.getByRole("radio", { name: /Ana García/ })).toBeInTheDocument();
    });

    it("filters by phone or email", async () => {
      renderWithStore(<RecipientStep balanceCents={balanceCents} />, storeAtRecipientStep());
      await userEvent.type(screen.getByLabelText("Search contacts"), "5598");

      expect(screen.getAllByRole("radio")).toHaveLength(1);
      expect(screen.getByRole("radio", { name: /María López/ })).toBeInTheDocument();
    });

    it("shows a message when nothing matches", async () => {
      renderWithStore(<RecipientStep balanceCents={balanceCents} />, storeAtRecipientStep());
      await userEvent.type(screen.getByLabelText("Search contacts"), "zzz");

      expect(screen.queryByRole("radio")).not.toBeInTheDocument();
      expect(screen.getByText(/No contacts match/)).toHaveTextContent("zzz");
    });

    it("restores the list when the search is cleared", async () => {
      renderWithStore(<RecipientStep balanceCents={balanceCents} />, storeAtRecipientStep());
      const search = screen.getByLabelText("Search contacts");
      await userEvent.type(search, "zzz");
      await userEvent.clear(search);

      expect(screen.getAllByRole("radio")).toHaveLength(4);
    });
  });

  describe("selection", () => {
    it("selects a contact and stores its name as the recipient", async () => {
      const { store } = renderWithStore(
        <RecipientStep balanceCents={balanceCents} />,
        storeAtRecipientStep(),
      );
      await userEvent.click(screen.getByRole("radio", { name: /Ana García/ }));

      expect(store.getState().transfer.recipient).toBe("Ana García");
      expect(screen.getByRole("radio", { name: /Ana García/ })).toBeChecked();
      expect(screen.getByText(/Sending to:/)).toHaveTextContent("Ana García");
    });

    it("changes the selection", async () => {
      const { store } = renderWithStore(
        <RecipientStep balanceCents={balanceCents} />,
        storeAtRecipientStep(),
      );
      await userEvent.click(screen.getByRole("radio", { name: /Ana García/ }));
      await userEvent.click(screen.getByRole("radio", { name: /Carlos Ruiz/ }));

      expect(store.getState().transfer.recipient).toBe("Carlos Ruiz");
      expect(screen.getByRole("radio", { name: /Ana García/ })).not.toBeChecked();
    });

    it("shows an already selected recipient (coming back to the step)", () => {
      const store = storeAtRecipientStep();
      store.dispatch(setRecipient("Luis Hernández"));
      renderWithStore(<RecipientStep balanceCents={balanceCents} />, store);

      expect(screen.getByRole("radio", { name: /Luis Hernández/ })).toBeChecked();
    });

    describe("two contacts with the same name", () => {
      const sameName: Contact[] = [
        { id: "a", name: "Sam Lee", phoneOrEmail: "5511110000", isFavorite: false },
        { id: "b", name: "Sam Lee", phoneOrEmail: "5522220000", isFavorite: false },
        { id: "c", name: "Sam Lee", phoneOrEmail: "5533330000", isFavorite: false },
      ];

      it("selects only the one the user clicked", async () => {
        mockContacts({ contacts: sameName });
        const { store } = renderWithStore(
          <RecipientStep balanceCents={balanceCents} />,
          storeAtRecipientStep(),
        );

        await userEvent.click(screen.getByRole("radio", { name: /5511110000/ }));

        expect(screen.getByRole("radio", { name: /5511110000/ })).toBeChecked();
        expect(screen.getByRole("radio", { name: /5522220000/ })).not.toBeChecked();
        expect(screen.getByRole("radio", { name: /5533330000/ })).not.toBeChecked();
        expect(store.getState().transfer.recipient).toBe("Sam Lee");
      });

      it("moves the selection to another contact with the same name", async () => {
        mockContacts({ contacts: sameName });
        renderWithStore(<RecipientStep balanceCents={balanceCents} />, storeAtRecipientStep());

        await userEvent.click(screen.getByRole("radio", { name: /5511110000/ }));
        await userEvent.click(screen.getByRole("radio", { name: /5522220000/ }));

        expect(screen.getByRole("radio", { name: /5522220000/ })).toBeChecked();
        expect(screen.getByRole("radio", { name: /5511110000/ })).not.toBeChecked();
      });

      it("shows the first match as selected when coming back to the step", () => {
        mockContacts({ contacts: sameName });
        const store = storeAtRecipientStep();
        store.dispatch(setRecipient("Sam Lee"));
        renderWithStore(<RecipientStep balanceCents={balanceCents} />, store);

        expect(
          screen.getAllByRole("radio").filter((radio) => (radio as HTMLInputElement).checked),
        ).toHaveLength(1);
        expect(screen.getByRole("radio", { name: /5511110000/ })).toBeChecked();
      });
    });
  });

  describe("Continue", () => {
    it("asks for a recipient when none is selected", async () => {
      const { store } = renderWithStore(
        <RecipientStep balanceCents={balanceCents} />,
        storeAtRecipientStep(),
      );
      await userEvent.click(screen.getByRole("button", { name: "Continue" }));

      expect(screen.getByRole("alert")).toHaveTextContent("Choose a recipient.");
      expect(store.getState().transfer.step).toBe("recipient");
    });

    it("does not show the error before Continue is pressed", () => {
      renderWithStore(<RecipientStep balanceCents={balanceCents} />, storeAtRecipientStep());
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("goes to the summary with a recipient", async () => {
      const { store } = renderWithStore(
        <RecipientStep balanceCents={balanceCents} />,
        storeAtRecipientStep(),
      );
      await userEvent.click(screen.getByRole("radio", { name: /Ana García/ }));
      await userEvent.click(screen.getByRole("button", { name: "Continue" }));

      expect(store.getState().transfer.step).toBe("summary");
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  describe("states", () => {
    it("shows a loading state while the contacts load", () => {
      mockContacts({ contacts: null, isLoading: true });
      renderWithStore(<RecipientStep balanceCents={balanceCents} />, storeAtRecipientStep());

      expect(screen.getByRole("status")).toHaveTextContent("Loading contacts");
      expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    });

    it("keeps showing the list while contacts are reloading", () => {
      mockContacts({ isLoading: true });
      renderWithStore(<RecipientStep balanceCents={balanceCents} />, storeAtRecipientStep());

      expect(screen.getAllByRole("radio")).toHaveLength(4);
    });

    it("shows an empty state when there are no contacts", () => {
      mockContacts({ contacts: [] });
      renderWithStore(<RecipientStep balanceCents={balanceCents} />, storeAtRecipientStep());

      expect(screen.getByText("No contacts yet")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "New contact" })).toBeInTheDocument();
    });

    it("shows an error with a retry button", async () => {
      mockContacts({
        contacts: null,
        error: { code: "NETWORK_ERROR", message: "We couldn't reach the server." },
      });
      renderWithStore(<RecipientStep balanceCents={balanceCents} />, storeAtRecipientStep());

      expect(screen.getByRole("alert")).toHaveTextContent("We couldn't load your contacts");
      await userEvent.click(screen.getByRole("button", { name: "Try again" }));
      expect(refetch).toHaveBeenCalledTimes(1);
    });

    it("lets the user add a contact even when the list failed to load", () => {
      mockContacts({
        contacts: null,
        error: { code: "NETWORK_ERROR", message: "We couldn't reach the server." },
      });
      renderWithStore(<RecipientStep balanceCents={balanceCents} />, storeAtRecipientStep());

      expect(screen.getByRole("button", { name: "New contact" })).toBeInTheDocument();
    });
  });

  describe("new contact", () => {
    async function openForm() {
      await userEvent.click(screen.getByRole("button", { name: "New contact" }));
    }

    async function fillForm(name: string, phoneOrEmail: string) {
      await userEvent.type(screen.getByLabelText("Name"), name);
      await userEvent.type(screen.getByLabelText("Email or phone"), phoneOrEmail);
    }

    it("opens and closes the form", async () => {
      renderWithStore(<RecipientStep balanceCents={balanceCents} />, storeAtRecipientStep());
      await openForm();
      expect(screen.getByRole("heading", { name: "New contact" })).toBeInTheDocument();

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
      const { store } = renderWithStore(
        <RecipientStep balanceCents={balanceCents} />,
        storeAtRecipientStep(),
      );

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
      renderWithStore(<RecipientStep balanceCents={balanceCents} />, storeAtRecipientStep());

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
      renderWithStore(<RecipientStep balanceCents={balanceCents} />, storeAtRecipientStep());

      await openForm();
      await userEvent.click(screen.getByRole("button", { name: "Save contact" }));

      expect(screen.getByLabelText("Name")).toHaveAttribute("aria-invalid", "true");
      expect(screen.getByLabelText("Email or phone")).toHaveAttribute("aria-invalid", "true");
      expect(screen.getByText("Name is required")).toBeInTheDocument();
      expect(requestCount).toBe(0);
    });

    it("rejects an invalid phone or email on blur", async () => {
      renderWithStore(<RecipientStep balanceCents={balanceCents} />, storeAtRecipientStep());

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
      const { store } = renderWithStore(
        <RecipientStep balanceCents={balanceCents} />,
        storeAtRecipientStep(),
      );

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
      renderWithStore(<RecipientStep balanceCents={balanceCents} />, storeAtRecipientStep());

      await openForm();
      await fillForm("Pedro Sol", "5511112222");
      await userEvent.click(screen.getByRole("button", { name: "Save contact" }));

      expect(await screen.findByText(/couldn't reach the server/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Save contact" })).toBeEnabled();
    });
  });
});
