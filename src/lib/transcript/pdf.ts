"use client";

import { downloadBlob } from "@/lib/files/download";
import type { TranscriptPdfPayload } from "@/lib/transcript/pdf-payload";

async function requestTranscriptPdf(payload: TranscriptPdfPayload) {
  const response = await fetch("/api/transcript/pdf", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let message = "The transcript PDF could not be created.";

    try {
      const errorBody = (await response.json()) as { message?: string };
      if (typeof errorBody.message === "string" && errorBody.message.trim()) {
        message = errorBody.message;
      }
    } catch {
      // Ignore malformed error payloads and use the default message.
    }

    throw new Error(message);
  }

  return response.blob();
}

export async function getTranscriptPdfBlob(payload: TranscriptPdfPayload) {
  return requestTranscriptPdf(payload);
}

export async function downloadTranscriptPdf(
  payload: TranscriptPdfPayload,
  filename: string,
) {
  const pdfBlob = await requestTranscriptPdf(payload);
  downloadBlob(pdfBlob, filename);
}
