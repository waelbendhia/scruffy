import { NextResponse } from "next/server";

export function middleware(request: Request) {
  const url = new URL(request.url);
  const headers = new Headers(request.headers);
  headers.set("x-url", request.url);
  headers.set("x-origin", url.origin);
  headers.set("x-pathname", url.pathname);

  return NextResponse.next({ request: { headers } });
}
