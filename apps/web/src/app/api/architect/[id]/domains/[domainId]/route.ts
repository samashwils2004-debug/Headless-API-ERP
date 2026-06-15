import { NextRequest, NextResponse } from "next/server";
import { proxyJson } from "@/app/api/_utils";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; domainId: string }> }
) {
  const { id, domainId } = await params;
  const proxied = await proxyJson(
    `/api/architect/${id}/domains/${domainId}`,
    request,
    "DELETE"
  );
  return NextResponse.json(proxied.body, { status: proxied.status });
}