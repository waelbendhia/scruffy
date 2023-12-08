import { updaterBaseURL } from "@/api";
import EventSource from "eventsource";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  const eventSource = new EventSource(`${updaterBaseURL}/update/live`);
  try {
    console.error("sse created");
    eventSource.addEventListener("update-status", (e) => {
      try {
        writer.write(encoder.encode("data: " + e.data + "\n\n"));
      } catch (e) {
        console.error("onmessage", e);
        eventSource.close();
        writer.close().catch(() => {});
      }
    });

    eventSource.onerror = (err) => {
      console.error("error reading live update sse", err);
      writer.close().catch(() => {});
      eventSource.close();
    };
  } catch (e) {
    await writer.close().catch(() => {});
  }

  req.signal.addEventListener(
    "abort",
    () => {
      eventSource.close();
      writer.close().catch(() => {});
    },
    { once: true },
  );

  const resp = new Response(responseStream.readable, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "text/event-stream; charset=utf-8",
      Connection: "keep-alive",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      "Content-Encoding": "none",
    },
  });

  return resp;
}
