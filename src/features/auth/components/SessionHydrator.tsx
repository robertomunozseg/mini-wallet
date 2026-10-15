"use client";

import { useEffect } from "react";
import type { User } from "@/domain/types";
import { useAppDispatch } from "@/store/hooks";
import { hydrate } from "@/store/slices/sessionSlice";

type SessionHydratorProps = { user: User };

// Copies the user from the server into the Redux store. It renders nothing.
// The store starts empty on every page load, so something has to fill it.
export const SessionHydrator = ({ user }: SessionHydratorProps) => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(hydrate(user));
  }, [dispatch, user]);

  return null;
};
