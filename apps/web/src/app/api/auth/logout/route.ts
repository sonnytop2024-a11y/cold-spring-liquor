import { NextRequest, NextResponse } from "next/server";
import { store } from "../../_mock/store";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("csl-session")?.value;
  if (token) store.deleteSession(token);
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("csl-session");
  return res;
}
