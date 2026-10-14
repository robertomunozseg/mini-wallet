import { memo } from "react";
import type { Contact } from "@/domain/types";
import { ContactOption } from "./ContactOption";

type ContactGroupProps = {
  title: string;
  contacts: Contact[];
  selectedId: string | null;
  onSelect: (contact: Contact) => void;
};

// A group of contacts as radio buttons: native keyboard support (arrows) and screen reader labels.
// memo: while the user types in the search box the parent re-renders on every key, but the group
// keeps the same props until the debounced search brings a new list, so it is skipped.
export const ContactGroup = memo(function ContactGroup({
  title,
  contacts,
  selectedId,
  onSelect,
}: ContactGroupProps) {
  if (contacts.length === 0) return null;

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-medium text-zinc-600">{title}</legend>
      {contacts.map((contact) => (
        <ContactOption
          key={contact.id}
          contact={contact}
          checked={contact.id === selectedId}
          onSelect={onSelect}
        />
      ))}
    </fieldset>
  );
});
