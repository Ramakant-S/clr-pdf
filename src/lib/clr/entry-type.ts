import {
  transcriptEntryTypes,
  type TranscriptEntryType,
} from "@/lib/clr/types";

const entryTypeLabels: Record<TranscriptEntryType, string> = {
  coursework: "Coursework",
  internship: "Internship",
  "live project": "Live Project",
  assessment: "Assessment",
};

export function normalizeTranscriptEntryType(
  value: unknown,
): TranscriptEntryType | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }

  if (normalized === "course work" || normalized === "course") {
    return "coursework";
  }

  if (
    normalized === "liveproject" ||
    normalized === "live-project" ||
    normalized === "project"
  ) {
    return "live project";
  }

  if (
    normalized === "internship placement" ||
    normalized === "placement" ||
    normalized === "work placement"
  ) {
    return "internship";
  }

  if (normalized === "evaluation" || normalized === "exam") {
    return "assessment";
  }

  return transcriptEntryTypes.find((entryType) => entryType === normalized);
}

export function resolveTranscriptEntryType(
  ...values: unknown[]
): TranscriptEntryType {
  for (const value of values) {
    const explicit = normalizeTranscriptEntryType(value);
    if (explicit) {
      return explicit;
    }
  }

  const haystack = values
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();

  if (/internship|placement/.test(haystack)) {
    return "internship";
  }

  if (/live project|capstone|project/.test(haystack)) {
    return "live project";
  }

  if (/assessment|evaluation|exam|test/.test(haystack)) {
    return "assessment";
  }

  return "coursework";
}

export function formatTranscriptEntryType(
  entryType: TranscriptEntryType,
) {
  return entryTypeLabels[entryType];
}
