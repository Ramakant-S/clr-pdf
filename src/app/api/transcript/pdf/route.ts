import { NextResponse } from "next/server";
import { chromium } from "playwright";
import type { TranscriptPdfPayload } from "@/lib/transcript/pdf-payload";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isTranscriptPdfPayload(value: unknown): value is TranscriptPdfPayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as Partial<TranscriptPdfPayload>;
  return Boolean(payload.record && payload.customization);
}

export async function POST(request: Request) {
  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;

  try {
    const body = await request.json();
    if (!isTranscriptPdfPayload(body)) {
      return NextResponse.json(
        { message: "The transcript PDF request was invalid." },
        { status: 400 },
      );
    }

    const origin = new URL(request.url).origin;
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({
      viewport: { width: 1400, height: 1200 },
      deviceScaleFactor: 2,
    });

    await page.addInitScript((payload: TranscriptPdfPayload) => {
      window.__TRANSCRIPT_PDF_PAYLOAD__ = payload;
    }, body);
    await page.emulateMedia({ media: "print" });
    await page.goto(`${origin}/print/transcript`, { waitUntil: "networkidle" });
    await page.waitForSelector("[data-transcript-root]");
    await page.waitForFunction(() => document.body.dataset.pdfReady === "true");

    const pdfBuffer = await page.pdf({
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: "0mm",
        right: "0mm",
        bottom: "0mm",
        left: "0mm",
      },
    });

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "content-type": "application/pdf",
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "The transcript PDF could not be created.";

    return NextResponse.json({ message }, { status: 500 });
  } finally {
    await browser?.close();
  }
}
