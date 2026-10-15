import { combineReducers, configureStore } from "@reduxjs/toolkit";
import sessionReducer from "./slices/sessionSlice";
import transferReducer from "./slices/transferSlice";

const rootReducer = combineReducers({
  session: sessionReducer,
  transfer: transferReducer,
});

export type RootState = ReturnType<typeof rootReducer>;

// A function, not a ready-made store: a store created at module level would be shared by every
// user on the server.
export const makeStore = (preloadedState?: Partial<RootState>) =>
  configureStore({ reducer: rootReducer, preloadedState });

export type AppStore = ReturnType<typeof makeStore>;
export type AppDispatch = AppStore["dispatch"];
