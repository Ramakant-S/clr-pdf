import { NextResponse } from "next/server";
import { getDemoClrPayload } from "@/lib/clr/normalize";

export const dynamic = "force-static";

export async function GET() {
  return NextResponse.json(getDemoClrPayload());
}
