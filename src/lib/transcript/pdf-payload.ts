import type {
  TranscriptCustomization,
  TranscriptRecord,
  TranscriptTemplate,
} from "@/lib/clr/types";

export interface TranscriptPdfPayload {
  record: TranscriptRecord;
  customization: TranscriptCustomization;
  template?: TranscriptTemplate;
}
