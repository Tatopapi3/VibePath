import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 30;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Haiku keeps the tutor snappy and cheap for a back-and-forth chat, and
// well inside this route's 30s cap. Matches app/api/explain/route.ts.
const MODEL = "claude-haiku-4-5-20251001";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface PageContext {
  kind: "build" | "lesson" | "learn" | "practice" | "journey" | "generic";
  title?: string;
  detail?: string;
}

const BASE_SYSTEM = `You are the VibePath tutor — a warm, encouraging coding teacher for people learning to build apps.

Style:
- Explain like you're pairing with a beginner. Short paragraphs, concrete examples.
- Prefer showing a tiny code snippet over a wall of prose.
- When they're stuck, ask one clarifying question or give the next single step — don't dump everything.
- If they paste an error, explain what it means in plain language, then the fix.
- Never be condescending. It's fine to say "great question".
- Keep answers focused; a few sentences to a few short paragraphs unless they ask for depth.`;

function contextBlock(ctx?: PageContext): string {
  if (!ctx || ctx.kind === "generic") return "";
  if (ctx.kind === "build") {
    return `\n\nThe learner is on the App Builder. They describe an app and Claude generates a single-file HTML/JS app.${
      ctx.detail ? `\n\nHere is the code currently in their preview (may be truncated):\n\`\`\`\n${ctx.detail.slice(0, 6000)}\n\`\`\`\nWhen they ask "how does this work" or "what is X", ground your answer in THIS code.` : ""
    }`;
  }
  if (ctx.kind === "lesson") {
    return `\n\nThe learner is working through the lesson "${ctx.title ?? "a lesson"}".${
      ctx.detail ? `\n\nLesson content:\n${ctx.detail.slice(0, 5000)}\n\nStay on this topic; connect answers back to what the lesson is teaching.` : ""
    }`;
  }
  if (ctx.kind === "practice") {
    return `\n\nThe learner is in the Practice area (quiz drills and a code playground). Help them reason it out — nudge toward the answer rather than just handing it over.`;
  }
  if (ctx.kind === "learn" || ctx.kind === "journey") {
    return `\n\nThe learner is browsing the curriculum. Help them figure out what to study next and answer questions about concepts.`;
  }
  return "";
}

export async function POST(req: Request) {
  let body: { messages?: ChatMessage[]; context?: PageContext };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const messages = (body.messages ?? [])
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-20)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 8000) }));

  if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
    return Response.json({ error: "Last message must be from the user" }, { status: 400 });
  }

  let stream;
  try {
    stream = anthropic.messages.stream({
      model: MODEL,
      max_tokens: 1200,
      system: BASE_SYSTEM + contextBlock(body.context),
      messages,
    });
  } catch (err) {
    console.error("Tutor stream failed to start:", err);
    return Response.json({ error: "Couldn't reach the tutor. Try again." }, { status: 502 });
  }

  const iterator = stream[Symbol.asyncIterator]();
  let first;
  try {
    first = await iterator.next();
  } catch (err) {
    console.error("Tutor failed before streaming:", err);
    return Response.json({ error: "Couldn't reach the tutor. Try again." }, { status: 502 });
  }

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        let result = first;
        while (!result.done) {
          const chunk = result.value;
          if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(chunk.delta.text));
          }
          result = await iterator.next();
        }
      } catch (err) {
        console.error("Tutor stream error:", err);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
