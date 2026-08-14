import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT } from "@/lib/prompts";

export const maxDuration = 60;

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
      max_tokens: 16000,
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
      try {
        let result = first;
        while (!result.done) {
          const chunk = result.value;
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(chunk.delta.text));
          }
          result = await iterator.next();
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
