import { load } from "cheerio";
import { NextResponse } from "next/server";
import { defaultInstitutionBranding } from "@/lib/branding/defaults";
import {
  getDemoClrPayload,
  normalizeClrDocument,
  parseJsonSource,
} from "@/lib/clr/normalize";
import type { NormalizeClrRequest } from "@/lib/clr/types";

export const dynamic = "force-dynamic";

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function looksLikeClrNode(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  const typeValues = Array.isArray(value.type)
    ? value.type
    : value.type != null
      ? [value.type]
      : [];

  const typeSet = new Set(
    typeValues.filter((entry): entry is string => typeof entry === "string"),
  );

  return (
    typeSet.has("ClrCredential") ||
    typeSet.has("OpenBadgeCredential") ||
    typeSet.has("AchievementCredential") ||
    (value.credentialSubject != null &&
      (value.verifiableCredential != null || value.achievement != null))
  );
}

function searchClrNode(value: unknown, depth = 0): unknown | undefined {
  if (depth > 10) {
    return undefined;
  }

  if (looksLikeClrNode(value)) {
    return value;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const match = searchClrNode(entry, depth + 1);
      if (match) {
        return match;
      }
    }

    return undefined;
  }

  if (!isRecord(value)) {
    return undefined;
  }

  for (const entry of Object.values(value)) {
    const match = searchClrNode(entry, depth + 1);
    if (match) {
      return match;
    }
  }

  return undefined;
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, {
    cache: "no-store",
    redirect: "follow",
    headers: {
      accept: "application/json, application/ld+json, text/html;q=0.9, */*;q=0.5",
    },
  });

  if (!response.ok) {
    throw new Error(`Remote source returned ${response.status} ${response.statusText}.`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  const body = await response.text();

  if (contentType.includes("json")) {
    return JSON.parse(body);
  }

  const trimmed = body.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return JSON.parse(trimmed);
  }

  const $ = load(body);
  const structuredScripts = $("script[type='application/ld+json'], script[type='application/json']")
    .toArray()
    .map((element) => $(element).text().trim())
    .filter(Boolean);

  for (const scriptBody of structuredScripts) {
    try {
      const parsed = JSON.parse(scriptBody);
      const match = searchClrNode(parsed);
      if (match) {
        return match;
      }
    } catch {
      // Ignore malformed blocks and continue searching.
    }
  }

  const nextDataText = $("#__NEXT_DATA__").text().trim();
  if (nextDataText) {
    try {
      const parsed = JSON.parse(nextDataText);
      const match = searchClrNode(parsed);
      if (match) {
        return match;
      }
    } catch {
      // Ignore Next.js state payload parsing failures.
    }
  }

  const alternateHref =
    $("link[rel='alternate'][type*='json']").first().attr("href") ??
    $("a[href$='.json']").first().attr("href");

  if (alternateHref) {
    const alternateUrl = new URL(alternateHref, response.url).toString();
    return fetchJson(alternateUrl);
  }

  throw new Error(
    "The provided page did not expose CLR JSON or embedded JSON-LD. Use the direct CLR JSON URL or paste the JSON payload instead.",
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as NormalizeClrRequest;

    if (body.mode === "demo") {
      return NextResponse.json(
        normalizeClrDocument(getDemoClrPayload(), {
          mode: "demo",
          sourceUrl: defaultInstitutionBranding.verificationUrl,
        }),
      );
    }

    if (body.mode === "json") {
      if (!body.json?.trim()) {
        return NextResponse.json(
          { message: "Paste CLR JSON before generating the transcript." },
          { status: 400 },
        );
      }

      return NextResponse.json(
        normalizeClrDocument(parseJsonSource(body.json), {
          mode: "json",
        }),
      );
    }

    if (!body.url?.trim()) {
      return NextResponse.json(
        { message: "Enter a CLR URL before generating the transcript." },
        { status: 400 },
      );
    }

    const payload = await fetchJson(body.url.trim());
    return NextResponse.json(
      normalizeClrDocument(payload, {
        mode: "url",
        sourceUrl: body.url.trim(),
      }),
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "The CLR source could not be processed.";

    return NextResponse.json({ message }, { status: 400 });
  }
}
