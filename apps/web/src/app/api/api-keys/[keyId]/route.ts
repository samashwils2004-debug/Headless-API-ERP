import { NextRequest, NextResponse } from "next/server";
import { proxyJson } from "../../_utils";

export async function DELETE(req: NextRequest, { params }: { params: { keyId: string } }) {
  const { status, body } = await proxyJson(`/api-keys/${params.keyId}`, req, "DELETE");
  return NextResponse.json(body, { status });
}
