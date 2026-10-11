import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const itemSchema = {
  type: "object",
  additionalProperties: false,
  required: ["id", "sentiment", "sentiment_score", "category", "urgency", "summary", "suggested_action"],
  properties: {
    id: { type: "string" },
    sentiment: { type: "string", enum: ["positive", "neutral", "negative"] },
    sentiment_score: { type: "number", description: "-1 (very negative) to 1 (very positive)" },
    category: {
      type: "string",
      enum: ["Product", "Pricing", "Support", "Delivery", "UX", "Performance", "Other"],
    },
    urgency: { type: "string", enum: ["low", "medium", "high"] },
    summary: { type: "string" },
    suggested_action: { type: "string" },
  },
};

export const analyzeFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { ids?: string[] }) => z.object({ ids: z.array(z.string().uuid()).max(25).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { streamJson, AiError } = await import("./ai.server");
    let q = context.supabase.from("feedback").select("id, content").is("analyzed_at", null).limit(20);
    if (data.ids?.length) q = context.supabase.from("feedback").select("id, content").in("id", data.ids);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    if (!rows?.length) return { analyzed: 0 };

    try {
      const out = (await streamJson({
        instructions:
          "You are a customer-intelligence analyst. For each feedback item, classify sentiment, score it, pick a category and urgency, write a one-sentence summary, and suggest one concrete business action. Return every id given.",
        input: JSON.stringify(rows),
        schemaName: "feedback_analysis",
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["items"],
          properties: { items: { type: "array", items: itemSchema } },
        },
      })) as { items: Array<Record<string, unknown> & { id: string }> };

      const now = new Date().toISOString();
      const valid = new Set(rows.map((r) => r.id));
      let n = 0;
      for (const it of out.items) {
        if (!valid.has(it.id)) continue;
        const { id, ...rest } = it;
        const score = Math.max(-1, Math.min(1, Number(rest.sentiment_score) || 0));
        await context.supabase
          .from("feedback")
          .update({ ...(rest as object), sentiment_score: score, analyzed_at: now })
          .eq("id", id);
        n++;
      }
      return { analyzed: n };
    } catch (e) {
      if (e instanceof AiError) {
        if (e.status === 402) return { analyzed: 0, error: "AI credits are used up. Add credits to keep analysing." };
        if (e.status === 429) return { analyzed: 0, error: "Too many requests — please wait a moment and try again." };
        return { analyzed: 0, error: e.message };
      }
      throw e;
    }
  });
