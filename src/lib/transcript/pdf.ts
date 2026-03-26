"use client";

import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

async function buildTranscriptPdf(root: HTMLElement) {
  const pages = Array.from(
    root.querySelectorAll<HTMLElement>("[data-transcript-page]"),
  );

  if (pages.length === 0) {
    throw new Error("No transcript pages are available for export.");
  }

  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
    compress: true,
  });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  if ("fonts" in document) {
    await document.fonts.ready;
  }

  root.setAttribute("data-exporting", "true");

  try {
    const renderScale = Math.max(window.devicePixelRatio || 1, 2.5);

    for (const [index, page] of pages.entries()) {
      const canvas = await html2canvas(page, {
        backgroundColor: "#ffffff",
        scale: renderScale,
        useCORS: true,
        logging: false,
        windowWidth: page.scrollWidth,
        windowHeight: page.scrollHeight,
      });

      const imageData = canvas.toDataURL("image/png");
      const aspectRatio = canvas.width / canvas.height;
      let renderWidth = pageWidth;
      let renderHeight = renderWidth / aspectRatio;

      if (renderHeight > pageHeight) {
        renderHeight = pageHeight;
        renderWidth = renderHeight * aspectRatio;
      }

      const x = (pageWidth - renderWidth) / 2;
      const y = (pageHeight - renderHeight) / 2;
      if (index > 0) {
        pdf.addPage("a4", "landscape");
      }

      pdf.addImage(
        imageData,
        "PNG",
        x,
        y,
        renderWidth,
        renderHeight,
        undefined,
        "FAST",
      );
    }

    return pdf;
  } finally {
    root.removeAttribute("data-exporting");
  }
}

export async function getTranscriptPdfBlob(root: HTMLElement) {
  const pdf = await buildTranscriptPdf(root);
  return pdf.output("blob");
}

export async function downloadTranscriptPdf(
  root: HTMLElement,
  filename: string,
) {
  const pdf = await buildTranscriptPdf(root);

  pdf.save(filename);
}
