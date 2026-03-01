import { NextRequest, NextResponse } from "next/server";
import { proxyJson } from "../../../_utils";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { status, body } = await proxyJson(`/templates/${params.id}/deploy`, req, "POST");
  return NextResponse.json(body, { status });
}
