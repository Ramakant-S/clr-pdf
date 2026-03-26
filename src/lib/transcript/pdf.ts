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

  return {
    width: Math.max(
      Math.ceil(bounds.width),
      page.scrollWidth,
      page.offsetWidth,
      page.clientWidth,
      1,
    ),
    height: Math.max(
      Math.ceil(bounds.height),
      page.scrollHeight,
      page.offsetHeight,
      page.clientHeight,
      1,
    ),
  };
}

function isCanvasEffectivelyBlank(canvas: HTMLCanvasElement) {
  const sampleCanvas = document.createElement("canvas");
  sampleCanvas.width = 64;
  sampleCanvas.height = 64;

  const sampleContext = sampleCanvas.getContext("2d", { willReadFrequently: true });
  if (!sampleContext) {
    return false;
  }

  sampleContext.drawImage(canvas, 0, 0, sampleCanvas.width, sampleCanvas.height);
  const { data } = sampleContext.getImageData(
    0,
    0,
    sampleCanvas.width,
    sampleCanvas.height,
  );

  let visibleInkPixels = 0;

  for (let index = 0; index < data.length; index += 4) {
    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    const alpha = data[index + 3];

    if (alpha > 0 && (red < 245 || green < 245 || blue < 245)) {
      visibleInkPixels += 1;
    }
  }

  return visibleInkPixels < 24;
}

async function renderPageCanvas(
  page: HTMLElement,
  pageSize: ReturnType<typeof getPageSizePx>,
  windowWidth: number,
  windowHeight: number,
  renderScale: number,
) {
  const baseOptions = {
    backgroundColor: "#ffffff",
    scale: renderScale,
    useCORS: true,
    logging: false,
    width: pageSize.width,
    height: pageSize.height,
    windowWidth,
    windowHeight,
    scrollX: 0,
    scrollY: 0,
    imageTimeout: 0,
    removeContainer: true,
  } satisfies Parameters<typeof html2canvas>[1];

  try {
    const foreignObjectCanvas = await html2canvas(page, {
      ...baseOptions,
      foreignObjectRendering: true,
    });

    if (!isCanvasEffectivelyBlank(foreignObjectCanvas)) {
      return foreignObjectCanvas;
    }
  } catch {
    // Fall through to the standard canvas renderer below.
  }

  return html2canvas(page, baseOptions);
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
      const canvas = await renderPageCanvas(
        page,
        pageSize,
        viewportWidth,
        viewportHeight,
        renderScale,
      );

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
