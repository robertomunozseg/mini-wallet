"use client";

import { useAppSelector } from "@/store/hooks";
import { selectUser } from "@/store/slices/sessionSlice";

// The signed-in user, read from the session slice (filled by SessionHydrator in the wallet layout).
export const CurrentUser = () => {
  const user = useAppSelector(selectUser);
  if (!user) return null;

  return <span className="text-sm font-medium text-zinc-700">{user.name}</span>;
};
