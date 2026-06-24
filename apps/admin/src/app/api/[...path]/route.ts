import { NextRequest, NextResponse } from "next/server";

// Server-side proxy: forwards all /api/* calls from admin to the web app.
// This bypasses next.config.mjs rewrites entirely, which can be unreliable on Vercel.
const WEB_URL = (process.env.WEB_API_URL ?? "https://coldspringliquor.com").replace(/\/$/, "");

async function proxy(req: NextRequest, params: { path: string[] }): Promise<NextResponse> {
  const path = params.path.join("/");
  const destination = `${WEB_URL}/api/${path}${req.nextUrl.search}`;

  const forwardHeaders: HeadersInit = {};
  const contentType = req.headers.get("content-type");
  if (contentType) forwardHeaders["content-type"] = contentType;

  try {
    const init: RequestInit = {
      method: req.method,
      headers: forwardHeaders,
      // body only for methods that allow it
      ...(req.method !== "GET" && req.method !== "HEAD"
        ? { body: await req.text() }
        : {}),
    };

    const upstream = await fetch(destination, init);
    const body = await upstream.arrayBuffer();

    const resHeaders = new Headers();
    const upstreamCT = upstream.headers.get("content-type");
    if (upstreamCT) resHeaders.set("content-type", upstreamCT);

    return new NextResponse(body, { status: upstream.status, headers: resHeaders });
  } catch (e) {
    console.error(`[admin proxy] ${req.method} /api/${path} → ${destination} failed:`, e);
    return NextResponse.json(
      { error: "Proxy error", detail: String(e), destination },
      { status: 502 }
    );
  }
}

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(req, params);
}
export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(req, params);
}
export async function PUT(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(req, params);
}
export async function PATCH(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(req, params);
}
export async function DELETE(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(req, params);
}
