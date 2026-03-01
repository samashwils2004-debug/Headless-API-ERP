import { NextRequest, NextResponse } from "next/server";
import { proxyJson } from "../_utils";

export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get("category");
  const path = category ? `/templates?category=${encodeURIComponent(category)}` : "/templates";
  const { status, body } = await proxyJson(path, req, "GET");
  return NextResponse.json(body, { status });
}
