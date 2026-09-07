import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT } from "@/lib/prompts";
import { TRUNCATION_MARKER } from "@/lib/truncationMarker";

// Vercel's Node runtime allows up to 300s on every plan (Hobby included);
// Pro/Enterprise can go higher with per-function config. 300 gives a big
// generation room to finish instead of the old 60s cap that forced tiny
// apps. The streamed truncation checks below still handle a real cutoff.
export const maxDuration = 300;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: Request) {
  const { prompt } = await req.json();

  if (!prompt || typeof prompt !== "string") {
    return Response.json({ error: "Missing prompt" }, { status: 400 });
  }

  let stream;
  try {
    stream = await anthropic.messages.stream({
      model: "claude-sonnet-4-6",
      // Sized to the ~40,000-character app budget the system prompt now
      // asks for (see lib/prompts.ts), with headroom. At ~280 chars/sec
      // that's well under this route's 300s maxDuration, so the token cap
      // is a runaway-response backstop, not the thing bounding app size.
      max_tokens: 24000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    });
  } catch (err) {
    console.error("Failed to start generation stream:", err);
    return Response.json({ error: "Failed to start generation" }, { status: 502 });
  }

  // Pull the first event before committing to the streamed Response, so
  // immediate failures (bad key, rate limit, etc.) can still return a clean
  // JSON error instead of a broken connection the client can't read.
  const iterator = stream[Symbol.asyncIterator]();
  let first;
  try {
    first = await iterator.next();
  } catch (err) {
    console.error("Generation failed before streaming began:", err);
    return Response.json({ error: "Failed to generate app. Please try again." }, { status: 502 });
  }

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      let stopReason: string | null = null;
      try {
        let result = first;
        while (!result.done) {
          const chunk = result.value;
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(chunk.delta.text));
          } else if (chunk.type === "message_delta") {
            stopReason = chunk.delta.stop_reason;
          }
          result = await iterator.next();
        }
        // A custom message attached to controller.error() here would not
        // reach the client — by this point bytes are already flowing and
        // the HTTP status is locked in, so a stream-level error only ever
        // surfaces as a generic "network error" with no detail (verified).
        // Signal truncation inside the successful response body instead;
        // the client checks for this marker and raises the real message.
        // Note: this only catches truncation the Anthropic stream itself
        // reports (stop_reason: "max_tokens"). A platform-level cutoff
        // (e.g. this function's own maxDuration) ends the connection with
        // no such signal — the client's own "does this look like a
        // complete document" check is what catches that case.
        if (stopReason === "max_tokens") {
          controller.enqueue(encoder.encode(TRUNCATION_MARKER));
        }
        controller.close();
      } catch (err) {
        console.error("Generation stream failed:", err);
        controller.error(new Error("Generation failed while streaming. Please try again."));
      }
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
