import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST() {
  cookies().delete("access_token");
  cookies().delete("refresh_token");
  cookies().delete("csrf_token");
  cookies().delete("institution_id");
  cookies().delete("project_id");
  return NextResponse.json({ ok: true });
}
