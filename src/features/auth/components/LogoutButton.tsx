"use client";

import { Button } from "@/components/ui/Button";
import { useLogout } from "../hooks/useLogout";

export const LogoutButton = () => {
  const { logout, isLoading, error } = useLogout();

  return (
    <div className="flex items-center gap-3">
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error.message}
        </p>
      )}
      <Button variant="ghost" loading={isLoading} onClick={() => void logout()}>
        Sign out
      </Button>
    </div>
  );
};
