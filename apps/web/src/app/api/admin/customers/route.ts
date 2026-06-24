import { NextResponse } from "next/server";
import { MOCK_CUSTOMERS } from "../../_mock/data";

export async function GET() {
  return NextResponse.json(MOCK_CUSTOMERS);
}
