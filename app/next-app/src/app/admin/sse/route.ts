import { updaterBaseURL } from "@/api";
import EventSource from "eventsource";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  let closed = false;
  const eventSource = new EventSource(`${updaterBaseURL}/update/live`);
  try {
    console.error("sse created");
    eventSource.onmessage = (event) => {
      try {
        writer.write(encoder.encode("data: " + event.data + "\n\n"));
      } catch (e) {
        console.error("onmessage", e);
        writer.close();
        eventSource.close();
      }
    };

    eventSource.onerror = (err) => {
      console.error("error reading live update sse", err);
      if (!closed) {
        try {
          writer.close();
        } catch (e) {
          eventSource.close();
        }
        closed = true;
      }
    };
  } catch (e) {
    writer.close();
  }

  req.signal.addEventListener(
    "abort",
    () => {
      if (!closed) {
        eventSource.close();
        writer.close();
      }
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
