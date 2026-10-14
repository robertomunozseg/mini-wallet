import { ButtonLink } from "@/components/ui/ButtonLink";

export default function ReceiptNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col items-center gap-3 py-12 text-center">
      <h1 className="text-2xl font-semibold text-zinc-900">Receipt not found</h1>
      <p className="text-zinc-700">This receipt does not exist or is no longer available.</p>
      <ButtonLink href="/home">Back to home</ButtonLink>
    </main>
  );
}
