import { Suspense, type ReactNode } from "react";
import { Spinner } from "@/components/ui/Spinner";
import { LogoutButton } from "@/features/auth/components/LogoutButton";
import { SessionGate } from "@/features/auth/components/SessionGate";

type WalletLayoutProps = { children: ReactNode };

export default function WalletLayout({ children }: WalletLayoutProps) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-3">
          <span className="text-lg font-semibold text-zinc-900">Mini Wallet</span>
          <LogoutButton />
        </div>
      </header>
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        {/* The proxy is only an optimistic check, so the session is verified here too. */}
        <Suspense fallback={<Spinner label="Loading your wallet" />}>
          <SessionGate>{children}</SessionGate>
        </Suspense>
      </div>
    </div>
  );
}
