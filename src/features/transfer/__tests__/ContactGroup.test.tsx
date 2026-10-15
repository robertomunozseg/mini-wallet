import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Contact } from "@/domain/types";
import { ContactGroup } from "../components/ContactGroup";

// A contact that counts how many times its name is read. A component reads it every time it
// renders, so the count is the number of renders: a skipped render (memo) reads nothing.
const trackedContact = (id: string): { contact: Contact; reads: () => number } => {
  let reads = 0;
  const contact: Contact = { id, name: "", phoneOrEmail: `55000000${id}`, isFavorite: false };
  Object.defineProperty(contact, "name", {
    enumerable: true,
    get() {
      reads += 1;
      return `Contact ${id}`;
    },
  });
  return { contact, reads: () => reads };
};
const plain: Contact[] = [
  { id: "1", name: "Ana García", phoneOrEmail: "ana.garcia@example.com", isFavorite: true },
  { id: "2", name: "Luis Hernández", phoneOrEmail: "5512345678", isFavorite: true },
];

describe("ContactGroup", () => {
  it("renders nothing for an empty list", () => {
    const { container } = render(
      <ContactGroup title="Favorites" contacts={[]} selectedId={null} onSelect={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a labelled group with one radio per contact", () => {
    render(
      <ContactGroup title="Favorites" contacts={plain} selectedId={null} onSelect={vi.fn()} />,
    );

    const group = screen.getByRole("group", { name: "Favorites" });
    expect(group).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(2);
  });

  it("checks only the selected contact", () => {
    render(<ContactGroup title="Favorites" contacts={plain} selectedId="2" onSelect={vi.fn()} />);

    expect(screen.getByRole("radio", { name: /Luis/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /Ana/ })).not.toBeChecked();
  });

  it("calls onSelect with the contact that was chosen", async () => {
    const onSelect = vi.fn();
    render(
      <ContactGroup title="Favorites" contacts={plain} selectedId={null} onSelect={onSelect} />,
    );

    await userEvent.click(screen.getByRole("radio", { name: /Ana/ }));
    expect(onSelect).toHaveBeenCalledWith(plain[0]);
  });

  describe("memoization", () => {
    function setup() {
      const tracked = ["1", "2", "3"].map(trackedContact);
      const contacts = tracked.map((item) => item.contact);
      const onSelect = vi.fn();
      const totalReads = () => tracked.reduce((sum, item) => sum + item.reads(), 0);
      const ui = (selectedId: string | null) => (
        <ContactGroup
          title="Other contacts"
          contacts={contacts}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      );
      return { tracked, totalReads, ui };
    }

    it("does not render again when the parent re-renders with the same props", () => {
      const { totalReads, ui } = setup();
      const { rerender } = render(ui(null));
      const afterFirstRender = totalReads();
      expect(afterFirstRender).toBeGreaterThan(0);

      rerender(ui(null));
      rerender(ui(null));
      expect(totalReads()).toBe(afterFirstRender);
    });

    it("re-renders only the two options whose checked state changed", () => {
      const { tracked, ui } = setup();
      const { rerender } = render(ui("1"));
      const before = tracked.map((item) => item.reads());

      rerender(ui("2")); // contact 1 is unchecked, contact 2 is checked, contact 3 is untouched
      const after = tracked.map((item) => item.reads());

      expect(after[0]).toBeGreaterThan(before[0] ?? 0);
      expect(after[1]).toBeGreaterThan(before[1] ?? 0);
      expect(after[2]).toBe(before[2]);
    });
  });
});
