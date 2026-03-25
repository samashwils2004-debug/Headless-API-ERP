import { NextRequest, NextResponse } from "next/server";
import { proxyJson } from "../../../_utils";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const proxied = await proxyJson(`/api/templates/${id}/deploy`, request, "POST", {});
  return NextResponse.json(proxied.body, { status: proxied.status });
}
