"use client";

import { useEffect, useRef, useState } from "react";
import { TranscriptPreview } from "@/components/transcript/transcript-preview";
import type { TranscriptPdfPayload } from "@/lib/transcript/pdf-payload";

declare global {
  interface Window {
    __TRANSCRIPT_PDF_PAYLOAD__?: TranscriptPdfPayload;
  }
}

export function TranscriptPrintClient() {
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [payload] = useState<TranscriptPdfPayload | null>(() =>
    typeof window === "undefined" ? null : (window.__TRANSCRIPT_PDF_PAYLOAD__ ?? null),
  );

  useEffect(() => {
    if (!payload) {
      return;
    }

    let cancelled = false;

    async function markReady() {
      if ("fonts" in document) {
        await document.fonts.ready;
      }

      await new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => resolve());
      });
      await new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => resolve());
      });

      if (!cancelled) {
        document.body.dataset.pdfReady = "true";
      }
    }

    void markReady();

    return () => {
      cancelled = true;
      delete document.body.dataset.pdfReady;
    };
  }, [payload]);

  if (!payload) {
    return null;
  }

  return (
    <TranscriptPreview
      record={payload.record}
      customization={payload.customization}
      previewRef={previewRef}
      template={payload.template}
    />
  );
}
