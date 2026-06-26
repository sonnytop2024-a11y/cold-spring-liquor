import { NextResponse } from "next/server";
export async function GET() {
  const id = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? "";
  const secret = process.env.PAYPAL_CLIENT_SECRET ?? "";
  return NextResponse.json({
    clientId_first10: id.slice(0, 10),
    clientId_last5: id.slice(-5),
    clientId_length: id.length,
    secret_first5: secret.slice(0, 5),
    secret_last5: secret.slice(-5),
    secret_length: secret.length,
  });
}
