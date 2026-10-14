import { combineReducers, configureStore } from "@reduxjs/toolkit";
import sessionReducer from "./slices/sessionSlice";
import transferReducer from "./slices/transferSlice";

const rootReducer = combineReducers({
  session: sessionReducer,
  transfer: transferReducer,
});

export type RootState = ReturnType<typeof rootReducer>;

// A new store per request/render tree: a module-level singleton would be shared between users
// on the server.
export function makeStore(preloadedState?: Partial<RootState>) {
  return configureStore({ reducer: rootReducer, preloadedState });
}

export type AppStore = ReturnType<typeof makeStore>;
export type AppDispatch = AppStore["dispatch"];
