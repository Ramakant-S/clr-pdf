import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import {
  defaultInstitutionBranding,
  defaultTranscriptCustomization,
} from "@/lib/branding/defaults";
import {
  getDemoClrPayload,
  normalizeClrDocument,
} from "@/lib/clr/normalize";
import type {
  SourceMode,
  TranscriptCustomization,
  TranscriptRecord,
  TranscriptTemplate,
} from "@/lib/clr/types";

type TranscriptTextField = Exclude<keyof TranscriptCustomization, "template">;

const demoTranscript = normalizeClrDocument(getDemoClrPayload(), {
  mode: "demo",
  sourceUrl: defaultInstitutionBranding.verificationUrl,
});

const defaultCustomization: TranscriptCustomization = {
  ...defaultTranscriptCustomization,
};

interface TranscriptState {
  mode: SourceMode;
  url: string;
  jsonInput: string;
  transcript: TranscriptRecord;
  custom: TranscriptCustomization;
  errorMessage: string;
}

const initialState: TranscriptState = {
  mode: "demo",
  url: "",
  jsonInput: JSON.stringify(getDemoClrPayload(), null, 2),
  transcript: demoTranscript,
  custom: defaultCustomization,
  errorMessage: "",
};

const transcriptSlice = createSlice({
  name: "transcript",
  initialState,
  reducers: {
    setMode(state, action: PayloadAction<SourceMode>) {
      state.mode = action.payload;
      state.errorMessage = "";
    },
    setUrl(state, action: PayloadAction<string>) {
      state.url = action.payload;
    },
    setJsonInput(state, action: PayloadAction<string>) {
      state.jsonInput = action.payload;
    },
    setTranscript(state, action: PayloadAction<TranscriptRecord>) {
      state.transcript = action.payload;
      state.errorMessage = "";
      if (action.payload.sourceType === "url" && action.payload.sourceUrl) {
        state.url = action.payload.sourceUrl;
      }
    },
    setCustomField(
      state,
      action: PayloadAction<{
        key: TranscriptTextField;
        value: string;
      }>,
    ) {
      state.custom[action.payload.key] = action.payload.value;
    },
    setTemplate(state, action: PayloadAction<TranscriptTemplate>) {
      state.custom.template = action.payload;
    },
    setErrorMessage(state, action: PayloadAction<string>) {
      state.errorMessage = action.payload;
    },
  },
});

export const {
  setMode,
  setUrl,
  setJsonInput,
  setTranscript,
  setCustomField,
  setTemplate,
  setErrorMessage,
} = transcriptSlice.actions;

export default transcriptSlice.reducer;
