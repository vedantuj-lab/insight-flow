import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { FileUp, Loader2, Sparkles, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { analyzeFeedback } from "@/lib/feedback.functions";
import { feedbackQuery, parseFeedbackText, SAMPLE_FEEDBACK } from "@/lib/feedback-data";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/feedback")({
  head: () => ({
    meta: [
      { title: "Feedback — InsightFlow AI" },
      { name: "description", content: "Add, upload and analyse customer feedback with AI." },
      { property: "og:title", content: "Feedback — InsightFlow AI" },
      { property: "og:description", content: "Collect customer feedback and let AI analyse it." },
    ],
  }),
  component: FeedbackPage,
});

export function AnalyzeButton({ label = "Analyse with AI" }: { label?: string }) {
  const run = useServerFn(analyzeFeedback);
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    try {
      const r = await run({ data: {} });
      if (r.error) toast.error(r.error);
      else toast.success(r.analyzed ? `Analysed ${r.analyzed} items` : "Nothing left to analyse");
      await qc.invalidateQueries({ queryKey: ["feedback"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Button onClick={go} disabled={busy}>
      {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1 h-4 w-4" />}
      {busy ? "Analysing…" : label}
    </Button>
  );
}

const sentVariant: Record<string, string> = {
  positive: "bg-positive/15 text-positive",
  neutral: "bg-neutral/15 text-neutral",
  negative: "bg-destructive/15 text-destructive",
};

function FeedbackPage() {
  const qc = useQueryClient();
  const { data = [] } = useQuery(feedbackQuery);
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function insert(rows: Array<{ content: string; customer_name: string | null; source: string }>) {
    if (!rows.length) return toast.error("No feedback found to add");
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("feedback")
      .insert(rows.map((r) => ({ ...r, content: r.content.slice(0, 4000), user_id: u.user!.id })));
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(`Added ${rows.length} feedback item${rows.length > 1 ? "s" : ""}`);
    qc.invalidateQueries({ queryKey: ["feedback"] });
  }

  async function addManual() {
    const rows = parseFeedbackText(text).map((r) => ({ ...r, customer_name: name || r.customer_name, source: "manual" }));
    await insert(rows);
    setText("");
  }

  async function onFile(f: File) {
    const raw = await f.text();
    await insert(parseFeedbackText(raw).map((r) => ({ ...r, source: "csv upload" })));
    if (fileRef.current) fileRef.current.value = "";
  }

  async function remove(id: string) {
    await supabase.from("feedback").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["feedback"] });
  }

  const pending = data.filter((f) => !f.analyzed_at).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-widest text-muted-foreground">Collect</p>
          <h1 className="text-4xl font-extrabold">Customer feedback</h1>
        </div>
        {pending > 0 && <AnalyzeButton label={`Analyse ${pending} with AI`} />}
      </div>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-6 lg:col-span-2">
          <h2 className="mb-3 text-lg font-bold">Paste feedback</h2>
          <Textarea
            rows={5}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="One piece of feedback per line…"
          />
          <div className="mt-3 flex flex-wrap gap-3">
            <Input className="max-w-xs" placeholder="Customer name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
            <Button onClick={addManual} disabled={saving || !text.trim()}>
              Add feedback
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-6">
          <h2 className="text-lg font-bold">Bulk import</h2>
          <p className="text-sm text-muted-foreground">
            Upload a CSV with a <code>feedback</code> column (and optional <code>name</code>), or a text file with one item per line.
          </p>
          <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
          <Button variant="secondary" onClick={() => fileRef.current?.click()} disabled={saving}>
            <FileUp className="mr-1 h-4 w-4" /> Upload file
          </Button>
          <Button
            variant="outline"
            disabled={saving}
            onClick={() => insert(SAMPLE_FEEDBACK.map((s) => ({ ...s })))}
          >
            Load 10 demo reviews
          </Button>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card">
        <div className="border-b border-border px-6 py-4 text-sm text-muted-foreground">{data.length} items</div>
        <ul className="divide-y divide-border">
          {data.map((f) => (
            <li key={f.id} className="group grid gap-3 px-6 py-5 md:grid-cols-[1fr_auto]">
              <div>
                <p>{f.content}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{f.customer_name ?? "Anonymous"}</span>·<span>{f.source}</span>
                  {f.analyzed_at ? (
                    <>
                      <Badge variant="outline" className={`border-0 capitalize ${sentVariant[f.sentiment ?? "neutral"]}`}>{f.sentiment}</Badge>
                      <Badge variant="outline">{f.category}</Badge>
                      {f.urgency === "high" && <Badge variant="destructive">urgent</Badge>}
                    </>
                  ) : (
                    <Badge variant="secondary">not analysed</Badge>
                  )}
                </div>
                {f.suggested_action && <p className="mt-2 text-sm text-primary">→ {f.suggested_action}</p>}
              </div>
              <Button size="icon" variant="ghost" aria-label="Delete" className="opacity-60 group-hover:opacity-100" onClick={() => remove(f.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
          {!data.length && <li className="px-6 py-10 text-center text-muted-foreground">Nothing here yet — paste feedback or load the demo reviews.</li>}
        </ul>
      </section>
    </div>
  );
}
