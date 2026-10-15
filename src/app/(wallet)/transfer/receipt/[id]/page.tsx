import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ReceiptView } from "@/features/transfer/components/ReceiptView";
import { getReceipt } from "@/server/services/transactionService";
import { getSession } from "@/server/session";

export const metadata: Metadata = { title: "Receipt" };

export default async function ReceiptPage({ params }: PageProps<"/transfer/receipt/[id]">) {
  // Reading the session makes the page dynamic: a receipt is created at runtime, not at build.
  const [session, { id }] = await Promise.all([getSession(), params]);
  if (!session) redirect("/login");

  // Server Components call the services directly: no fetch to our own API.
  const receipt = getReceipt(id);
  if (!receipt) notFound();

  return (
    <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-xl focus:outline-none">
      <h1 className="mb-4 text-2xl font-semibold text-zinc-900">Receipt</h1>
      <ReceiptView receipt={receipt} />
    </main>
  );
}
