import { NextRequest, NextResponse } from "next/server";
import { proxyJson } from "../../../_utils";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const proxied = await proxyJson(`/api/templates/${params.id}/deploy`, request, "POST", {});
  return NextResponse.json(proxied.body, { status: proxied.status });
}
