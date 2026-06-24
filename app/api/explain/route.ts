import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 30;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: Request) {
  const { code, prompt } = await req.json();

  const truncated = code.slice(0, 5000);

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: `You are a coding teacher. The user just built this app: "${prompt}".

Here is the code that was generated:
\`\`\`
${truncated}
\`\`\`

Create a lesson with 4-5 sections teaching the key concepts used in this code.
Each section should be engaging and educational for a beginner.

Return ONLY valid JSON in this exact format:
{
  "sections": [
    {
      "title": "Section title",
      "emoji": "relevant emoji",
      "concept": "One sentence explaining the core concept",
      "explanation": "2-3 sentences explaining it clearly for a beginner",
      "codeHint": "a short relevant code snippet (1-3 lines)",
      "takeaway": "The key thing to remember"
    }
  ]
}`,
      },
    ],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return Response.json({ sections: [] }, { status: 200 });

  try {
    const data = JSON.parse(match[0]);
    return Response.json(data);
  } catch {
    return Response.json({ sections: [] }, { status: 200 });
  }
}
