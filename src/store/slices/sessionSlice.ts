import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { User } from "@/domain/types";

type SessionState = { user: User | null };

type StateWithSession = { session: SessionState };

const initialState: SessionState = { user: null };

const sessionSlice = createSlice({
  name: "session",
  initialState,
  reducers: {
    hydrate(state, action: PayloadAction<User>) {
      state.user = action.payload;
    },
    clear(state) {
      state.user = null;
    },
  },
});

export const { hydrate, clear } = sessionSlice.actions;
export default sessionSlice.reducer;

export const selectUser = (state: StateWithSession) => state.session.user;
