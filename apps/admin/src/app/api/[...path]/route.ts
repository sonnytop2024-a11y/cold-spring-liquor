import { NextRequest, NextResponse } from "next/server";

// Server-side proxy: forwards all /api/* calls from admin to the web app.
// Runs server-side so there is no CORS issue — browser always calls the admin domain.
const WEB_URL = (process.env.WEB_API_URL ?? "https://coldspringliquor.com").replace(/\/$/, "");

type Ctx = { params: { path: string[] } };

async function proxy(req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const destination = `${WEB_URL}/api/${ctx.params.path.join("/")}${req.nextUrl.search}`;

  // Build headers as plain Record to avoid HeadersInit union issues
  const forwardHeaders: Record<string, string> = {};
  const ct = req.headers.get("content-type");
  if (ct) forwardHeaders["content-type"] = ct;
  // Forward admin secret so web API can verify the request came from admin panel
  const adminSecret = process.env.ADMIN_SECRET ?? "csl-admin-dev-secret";
  forwardHeaders["x-admin-secret"] = adminSecret;

  try {
    const hasBody = req.method !== "GET" && req.method !== "HEAD";
    const upstream = await fetch(destination, {
      method: req.method,
      headers: forwardHeaders,
      body: hasBody ? await req.arrayBuffer() : undefined,
    });

    const resHeaders: Record<string, string> = {};
    const upCT = upstream.headers.get("content-type");
    if (upCT) resHeaders["content-type"] = upCT;

    const data = await upstream.arrayBuffer();
    return new NextResponse(data, { status: upstream.status, headers: resHeaders });
  } catch (e) {
    console.error(`[admin proxy] ${req.method} ${destination} failed:`, e);
    return NextResponse.json({ error: "Proxy error", detail: String(e) }, { status: 502 });
  }
}

export async function GET(req: NextRequest, ctx: Ctx) { return proxy(req, ctx); }
export async function POST(req: NextRequest, ctx: Ctx) { return proxy(req, ctx); }
export async function PUT(req: NextRequest, ctx: Ctx) { return proxy(req, ctx); }
export async function PATCH(req: NextRequest, ctx: Ctx) { return proxy(req, ctx); }
export async function DELETE(req: NextRequest, ctx: Ctx) { return proxy(req, ctx); }
