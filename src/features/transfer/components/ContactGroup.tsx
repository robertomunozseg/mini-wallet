import type { Contact } from "@/domain/types";

type ContactGroupProps = {
  title: string;
  contacts: Contact[];
  selectedId: string | null;
  onSelect: (contact: Contact) => void;
};

// A group of contacts as radio buttons: native keyboard support (arrows) and screen reader labels.
export function ContactGroup({ title, contacts, selectedId, onSelect }: ContactGroupProps) {
  if (contacts.length === 0) return null;

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-medium text-zinc-600">{title}</legend>
      {contacts.map((contact) => (
        <label
          key={contact.id}
          className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2 has-checked:border-blue-600 has-checked:bg-blue-50 has-focus-visible:outline-2 has-focus-visible:outline-blue-600"
        >
          <input
            type="radio"
            name="recipient"
            value={contact.name}
            checked={contact.id === selectedId}
            onChange={() => onSelect(contact)}
            className="h-4 w-4 accent-blue-600"
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium text-zinc-900">{contact.name}</span>
            <span className="block truncate text-sm text-zinc-600">{contact.phoneOrEmail}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}
