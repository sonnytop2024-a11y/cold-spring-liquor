import { NextResponse } from "next/server";
import { store } from "../../_mock/store";

export async function GET() {
  return NextResponse.json(store.getActiveBundleTiers());
}
