import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Feedback = Tables<"feedback">;

export const feedbackQuery = {
  queryKey: ["feedback"],
  queryFn: async (): Promise<Feedback[]> => {
    const { data, error } = await supabase
      .from("feedback")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    return data ?? [];
  },
};

export const SAMPLE_FEEDBACK: Array<{ content: string; source: string; customer_name: string }> = [
  { content: "Checkout keeps failing on my phone after I enter card details. Tried 3 times. Really frustrating.", source: "app review", customer_name: "Priya S." },
  { content: "Love the new dashboard design, so much easier to find my orders!", source: "survey", customer_name: "Arjun M." },
  { content: "Delivery took 9 days instead of the promised 3. No updates in between.", source: "email", customer_name: "Neha K." },
  { content: "Your support team solved my issue in 5 minutes. Fantastic service.", source: "chat", customer_name: "Rahul D." },
  { content: "The premium plan is too expensive compared to competitors for what it offers.", source: "survey", customer_name: "Sneha P." },
  { content: "App is very slow to load product images on 4G.", source: "app review", customer_name: "Karan V." },
  { content: "It's okay. Does what it says, nothing special.", source: "survey", customer_name: "Meera J." },
  { content: "I was charged twice for one order and nobody replies to my emails!", source: "email", customer_name: "Vikram R." },
  { content: "Would be great to have a dark mode and Hindi language support.", source: "feature request", customer_name: "Ananya T." },
  { content: "Fast delivery and packaging was excellent. Will order again.", source: "app review", customer_name: "Rohit G." },
];

/** Parse a CSV/plain text paste: one feedback per line, or CSV with a "feedback"/"content" column. */
export function parseFeedbackText(raw: string): Array<{ content: string; customer_name: string | null }> {
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return [];
  const header = splitCsv(lines[0]).map((h) => h.toLowerCase());
  const ci = header.findIndex((h) => ["feedback", "content", "review", "comment", "text"].includes(h));
  if (ci >= 0) {
    const ni = header.findIndex((h) => ["name", "customer", "customer_name"].includes(h));
    return lines.slice(1).map((l) => {
      const cols = splitCsv(l);
      return { content: cols[ci] ?? "", customer_name: ni >= 0 ? cols[ni] || null : null };
    }).filter((r) => r.content.length > 2);
  }
  return lines.filter((l) => l.length > 2).map((content) => ({ content, customer_name: null }));
}

function splitCsv(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q;
    } else if (c === "," && !q) { out.push(cur.trim()); cur = ""; }
    else cur += c;
  }
  out.push(cur.trim());
  return out;
}
