import { NextResponse } from "next/server";
import { FLASH_DEALS } from "../../_mock/data";

export async function GET() {
  return NextResponse.json(FLASH_DEALS);
}
