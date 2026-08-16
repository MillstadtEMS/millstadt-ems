import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Use the Employee Lounge sign-in." },
    {
      status: 404,
      headers: {
        "Cache-Control": "no-store, private",
        "X-Robots-Tag": "noindex, nofollow, noarchive",
      },
    },
  );
}
