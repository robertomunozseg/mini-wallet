"use client";

import { useEffect } from "react";
import type { User } from "@/domain/types";
import { useAppDispatch } from "@/store/hooks";
import { hydrate } from "@/store/slices/sessionSlice";

type SessionHydratorProps = { user: User };

// Copies the user read on the server into the Redux store (it renders nothing).
// Needed because the store is created empty and is not kept between page loads.
export const SessionHydrator = ({ user }: SessionHydratorProps) => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(hydrate(user));
  }, [dispatch, user]);

  return null;
};
