import { Suspense, type ReactNode } from "react";
import { Spinner } from "@/components/ui/Spinner";
import { CurrentUser } from "@/features/auth/components/CurrentUser";
import { LogoutButton } from "@/features/auth/components/LogoutButton";
import { SessionGate } from "@/features/auth/components/SessionGate";

type WalletLayoutProps = { children: ReactNode };

export default function WalletLayout({ children }: WalletLayoutProps) {
  return (
    <div className="flex flex-1 flex-col">
      {/* First stop for keyboard users: it jumps over the header to the page content. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-4 focus:z-10 focus:rounded-lg focus:bg-blue-700 focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3">
          <span className="text-lg font-semibold text-zinc-900">Mini Wallet</span>
          <div className="flex items-center gap-3">
            <CurrentUser />
            <LogoutButton />
          </div>
        </div>
      </header>
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        {/* The proxy is only an optimistic check, so the session is verified here too. */}
        <Suspense fallback={<Spinner label="Loading your wallet" />}>
          <SessionGate>{children}</SessionGate>
        </Suspense>
      </div>
    </div>
  );
}
