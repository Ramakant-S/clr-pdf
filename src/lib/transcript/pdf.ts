"use client";

import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

async function waitForRenderableState(root: HTMLElement) {
  if ("fonts" in document) {
    await document.fonts.ready;
  }

  const images = Array.from(root.querySelectorAll<HTMLImageElement>("img"));
  await Promise.all(
    images.map(async (image) => {
      if (!image.currentSrc && !image.src) {
        return;
      }

      if (!image.complete) {
        await new Promise<void>((resolve) => {
          const finalize = () => {
            image.removeEventListener("load", finalize);
            image.removeEventListener("error", finalize);
            resolve();
          };

          image.addEventListener("load", finalize, { once: true });
          image.addEventListener("error", finalize, { once: true });
        });
      }

      if ("decode" in image) {
        try {
          await image.decode();
        } catch {
          // Ignore decode failures and continue with the rendered image state.
        }
      }
    }),
  );

  await new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
  await new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
}

function getPageSizePx(page: HTMLElement) {
  const bounds = page.getBoundingClientRect();
  const documentElement = page.ownerDocument.documentElement;

  return {
    // Use ceil + scroll dimensions so the rendered canvas never truncates the
    // final rows when content is close to page boundaries.
    width: Math.max(
      Math.ceil(bounds.width),
      page.offsetWidth,
      page.scrollWidth,
      documentElement.clientWidth,
      1,
    ),
    height: Math.max(
      Math.ceil(bounds.height),
      page.offsetHeight,
      page.scrollHeight,
      1,
    ),
  };
}

async function buildTranscriptPdf(root: HTMLElement) {
  const pages = Array.from(root.querySelectorAll<HTMLElement>("[data-transcript-page]"));

  if (pages.length === 0) {
    throw new Error("No transcript pages are available for export.");
  }

  await waitForRenderableState(root);

  const firstPageSize = getPageSizePx(pages[0]);
  const pageWidthMm = (firstPageSize.width * 25.4) / 96;
  const pageHeightMm = (firstPageSize.height * 25.4) / 96;
  const pdf = new jsPDF({
    orientation: pageWidthMm >= pageHeightMm ? "landscape" : "portrait",
    unit: "mm",
    format: [pageWidthMm, pageHeightMm],
    compress: false,
  });

  root.setAttribute("data-exporting", "true");

  try {
    const renderScale = Math.max(window.devicePixelRatio || 1, 3);
    const viewportWidth = Math.max(
      window.innerWidth,
      document.documentElement.clientWidth,
      root.scrollWidth,
      firstPageSize.width,
    );
    const viewportHeight = Math.max(
      window.innerHeight,
      document.documentElement.clientHeight,
      firstPageSize.height,
    );

    for (const [index, page] of pages.entries()) {
      await waitForRenderableState(page);

      const pageSize = getPageSizePx(page);
      const targetWidthMm = (pageSize.width * 25.4) / 96;
      const targetHeightMm = (pageSize.height * 25.4) / 96;
      const pageViewportWidth = Math.max(viewportWidth, pageSize.width);
      const pageViewportHeight = Math.max(viewportHeight, pageSize.height);
      const canvas = await html2canvas(page, {
        backgroundColor: "#ffffff",
        scale: renderScale,
        useCORS: true,
        logging: false,
        width: pageSize.width,
        height: pageSize.height,
        windowWidth: pageViewportWidth,
        windowHeight: pageViewportHeight,
        imageTimeout: 0,
        removeContainer: true,
      });

      const imageData = canvas.toDataURL("image/png");
      if (index > 0) {
        pdf.addPage([targetWidthMm, targetHeightMm], targetWidthMm >= targetHeightMm ? "landscape" : "portrait");
      }

      pdf.addImage(
        imageData,
        "PNG",
        0,
        0,
        targetWidthMm,
        targetHeightMm,
        undefined,
        "SLOW",
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
