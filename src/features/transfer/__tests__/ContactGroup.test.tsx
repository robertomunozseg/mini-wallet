import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Contact } from "@/domain/types";
import { ContactGroup } from "../components/ContactGroup";

const plain: Contact[] = [
  { id: "1", name: "Ana García", phoneOrEmail: "ana.garcia@example.com", isFavorite: true },
  { id: "2", name: "Luis Hernández", phoneOrEmail: "5512345678", isFavorite: true },
];

describe("ContactGroup", () => {
  it("renders a labelled group with one radio per contact", () => {
    render(
      <ContactGroup title="Favorites" contacts={plain} selectedId={null} onSelect={vi.fn()} />,
    );

    const group = screen.getByRole("group", { name: "Favorites" });
    expect(group).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(2);
  });

  it("calls onSelect with the contact that was chosen", async () => {
    const onSelect = vi.fn();
    render(
      <ContactGroup title="Favorites" contacts={plain} selectedId={null} onSelect={onSelect} />,
    );

    await userEvent.click(screen.getByRole("radio", { name: /Ana/ }));
    expect(onSelect).toHaveBeenCalledWith(plain[0]);
  });
});
