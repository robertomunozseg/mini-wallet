import { memo } from "react";
import type { Contact } from "@/domain/types";

type ContactOptionProps = {
  contact: Contact;
  checked: boolean;
  onSelect: (contact: Contact) => void;
};

// memo: choosing a contact, typing in the search box or loading another page re-renders the
// parent, but an option only re-renders when its own contact or checked state changes. That needs
// `onSelect` to keep the same identity between renders (the parent wraps it in useCallback).
export const ContactOption = memo(function ContactOption({
  contact,
  checked,
  onSelect,
}: ContactOptionProps) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2 has-checked:border-blue-600 has-checked:bg-blue-50 has-focus-visible:outline-2 has-focus-visible:outline-blue-600">
      <input
        type="radio"
        name="recipient"
        value={contact.name}
        checked={checked}
        onChange={() => onSelect(contact)}
        className="h-4 w-4 accent-blue-600"
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-zinc-900">{contact.name}</span>
        <span className="block truncate text-sm text-zinc-600">{contact.phoneOrEmail}</span>
      </span>
    </label>
  );
});
