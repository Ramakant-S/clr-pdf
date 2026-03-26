import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { NormalizeClrRequest, TranscriptRecord } from "@/lib/clr/types";

export const transcriptApi = createApi({
  reducerPath: "transcriptApi",
  baseQuery: fetchBaseQuery({
    baseUrl: "/api",
  }),
  endpoints: (builder) => ({
    normalizeClr: builder.mutation<TranscriptRecord, NormalizeClrRequest>({
      query: (body) => ({
        url: "/clr/normalize",
        method: "POST",
        body,
      }),
    }),
  }),
});

export const { useNormalizeClrMutation } = transcriptApi;
