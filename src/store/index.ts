import { configureStore } from "@reduxjs/toolkit";
import transcriptReducer from "@/store/transcript-slice";
import { transcriptApi } from "@/store/transcript-api";

export function makeStore() {
  return configureStore({
    reducer: {
      transcript: transcriptReducer,
      [transcriptApi.reducerPath]: transcriptApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(transcriptApi.middleware),
  });
}

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
