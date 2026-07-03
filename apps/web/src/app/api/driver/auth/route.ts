import { NextRequest, NextResponse } from "next/server";
import { dbValidateDriverPin, dbSaveDriver } from "@/lib/db";
import { store } from "../../_mock/store";

export async function POST(req: NextRequest) {
  const { username, pin } = await req.json();
  const driver = await dbValidateDriverPin(username, pin);
  if (!driver) {
    return NextResponse.json({ error: "Invalid username or PIN" }, { status: 401 });
  }
  if (!driver.active) {
    return NextResponse.json({ error: "Your account has been deactivated. Contact admin." }, { status: 403 });
  }
  // Session token is ephemeral — mock store is fine for this
  const token = store.createDriverSession(driver.id);
  const { passwordHash: _ph, ...safe } = driver;
  const res = NextResponse.json({ driver: safe, token });
  res.cookies.set("csl-driver-session", token, { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 12, path: "/" });
  return res;
}
