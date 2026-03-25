import { NextRequest, NextResponse } from "next/server";
import { proxyJson } from "../../../_utils";

type Params = { params: Promise<{ applicationId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const { applicationId } = await params;
  const body = await request.json();
  const proxied = await proxyJson(`/api/applications/${applicationId}/transition`, request, "POST", body);
  return NextResponse.json(proxied.body, { status: proxied.status });
}
