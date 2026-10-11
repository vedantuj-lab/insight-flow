// Server-only: calls Lovable AI Gateway (Responses API, streamed SSE) and returns final text.
const GATEWAY = "https://ai.gateway.lovable.dev/v1/responses";
export const AI_MODEL = "openai/gpt-6-astra";

export class AiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function streamJson(opts: {
  instructions: string;
  input: string;
  schemaName: string;
  schema: Record<string, unknown>;
}): Promise<unknown> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new AiError(401, "AI is not configured.");
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: AI_MODEL,
      stream: true,
      store: false,
      reasoning: { effort: "low" },
      instructions: opts.instructions,
      input: opts.input,
      text: {
        format: { type: "json_schema", name: opts.schemaName, strict: true, schema: opts.schema },
      },
    }),
  });
  if (!res.ok || !res.body) {
    let msg = `AI request failed (${res.status}).`;
    try {
      const j = (await res.json()) as { message?: string; error?: { message?: string } };
      msg = j.message ?? j.error?.message ?? msg;
    } catch {}
    throw new AiError(res.status, msg);
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      try {
        const ev = JSON.parse(data) as { type?: string; delta?: string; response?: { error?: { message?: string } } };
        if (ev.type === "response.output_text.delta" && ev.delta) text += ev.delta;
        if (ev.type === "response.failed") throw new AiError(500, ev.response?.error?.message ?? "AI failed.");
      } catch (e) {
        if (e instanceof AiError) throw e;
      }
    }
  }
  if (!text) throw new AiError(422, "The AI returned no answer for this feedback.");
  return JSON.parse(text);
}
