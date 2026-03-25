import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { detail: "Supabase broker tokens are disabled in this Aiven-based setup." },
    { status: 410 }
  );
}
