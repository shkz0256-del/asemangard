const DEFAULT_API_ORIGIN = "https://asemangard.vercel.app";
const ALLOWED_ENDPOINTS = new Set(["health", "register", "login", "me", "bookings"]);

export async function onRequest({ request, env }) {
  const incoming = new URL(request.url);
  const endpoint = incoming.pathname.replace(/^\/api\/?/, "").replace(/\/$/, "");

  if (!ALLOWED_ENDPOINTS.has(endpoint)) {
    return Response.json({ error: "not_found", message: "مسیر API پیدا نشد." }, { status: 404 });
  }

  const origin = (env.ASMAN_API_ORIGIN || DEFAULT_API_ORIGIN).replace(/\/$/, "");
  const target = new URL(`/api/${endpoint}${incoming.search}`, origin);
  const headers = new Headers();

  for (const name of ["accept", "content-type", "authorization"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  try {
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
      redirect: "manual"
    });

    const responseHeaders = new Headers(upstream.headers);
    for (const name of ["content-encoding", "content-length", "transfer-encoding", "connection"]) {
      responseHeaders.delete(name);
    }
    responseHeaders.set("cache-control", "no-store");

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders
    });
  } catch {
    return Response.json(
      { error: "upstream_unavailable", message: "ارتباط با سرور برقرار نشد؛ دوباره تلاش کنید." },
      { status: 502, headers: { "cache-control": "no-store" } }
    );
  }
}
