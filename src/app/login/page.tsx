import type { Metadata } from "next";
import { Card } from "@/components/ui/Card";
import { LoginForm } from "@/features/auth/components/LoginForm";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-8">
      <Card className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">Sign in</h1>
        <p className="mt-1 mb-6 text-sm text-zinc-600">
          Use your email or your 10-digit phone number.
        </p>
        <LoginForm />
      </Card>
    </main>
  );
}
