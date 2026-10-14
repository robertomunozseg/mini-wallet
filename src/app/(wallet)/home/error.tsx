"use client";

import { ErrorState } from "@/components/ui/ErrorState";

type HomeErrorProps = { reset: () => void };

// Error boundary for the Home page itself (e.g. the server failed while rendering it).
// Failures of the movements request are handled inside MovementsList.
export default function HomeError({ reset }: HomeErrorProps) {
  return (
    <ErrorState
      title="We couldn't load your home"
      message="Something went wrong while loading your account. Please try again."
      onRetry={reset}
    />
  );
}
