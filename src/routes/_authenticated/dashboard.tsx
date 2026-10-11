import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { AlertTriangle, Lightbulb, MessageSquareText, Smile, TrendingUp } from "lucide-react";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { feedbackQuery } from "@/lib/feedback-data";
import { Button } from "@/components/ui/button";
import { AnalyzeButton } from "./feedback";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — InsightFlow AI" },
      { name: "description", content: "Sentiment, themes and urgent issues across your customer feedback." },
      { property: "og:title", content: "Dashboard — InsightFlow AI" },
      { property: "og:description", content: "Your customer intelligence at a glance." },
    ],
  }),
  component: Dashboard,
});

const SENT_COLORS: Record<string, string> = {
  positive: "var(--positive)",
  neutral: "var(--neutral)",
  negative: "var(--destructive)",
};

function Dashboard() {
  const { data = [], isLoading } = useQuery(feedbackQuery);

  const s = useMemo(() => {
    const analyzed = data.filter((f) => f.analyzed_at);
    const count = (k: string) => analyzed.filter((f) => f.sentiment === k).length;
    const avg = analyzed.length ? analyzed.reduce((a, f) => a + Number(f.sentiment_score ?? 0), 0) / analyzed.length : 0;
    const cats = new Map<string, { name: string; total: number; negative: number }>();
    for (const f of analyzed) {
      const c = cats.get(f.category ?? "Other") ?? { name: f.category ?? "Other", total: 0, negative: 0 };
      c.total++;
      if (f.sentiment === "negative") c.negative++;
      cats.set(c.name, c);
    }
    const urgent = analyzed.filter((f) => f.urgency === "high");
    return {
      total: data.length,
      analyzed,
      pending: data.length - analyzed.length,
      csat: Math.round(((avg + 1) / 2) * 100),
      pie: ["positive", "neutral", "negative"].map((k) => ({ name: k, value: count(k) })),
      cats: [...cats.values()].sort((a, b) => b.total - a.total),
      urgent,
      positivePct: analyzed.length ? Math.round((count("positive") / analyzed.length) * 100) : 0,
    };
  }, [data]);

  if (isLoading) return <p className="text-muted-foreground">Loading insights…</p>;

  if (!s.total)
    return (
      <div className="rounded-2xl border border-dashed border-border p-16 text-center">
        <h1 className="text-3xl font-bold">No feedback yet</h1>
        <p className="mt-2 text-muted-foreground">Add customer feedback to see AI insights here.</p>
        <Button asChild className="mt-6">
          <Link to="/feedback">Add feedback</Link>
        </Button>
      </div>
    );

  const topIssue = s.cats.slice().sort((a, b) => b.negative - a.negative)[0];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-widest text-muted-foreground">Overview</p>
          <h1 className="text-4xl font-extrabold">Customer pulse</h1>
        </div>
        {s.pending > 0 && <AnalyzeButton label={`Analyse ${s.pending} pending`} />}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={MessageSquareText} label="Total feedback" value={s.total} hint={`${s.analyzed.length} analysed`} />
        <Kpi icon={Smile} label="Satisfaction index" value={`${s.csat}`} hint="0–100 from AI sentiment" accent />
        <Kpi icon={TrendingUp} label="Positive share" value={`${s.positivePct}%`} hint="of analysed feedback" />
        <Kpi icon={AlertTriangle} label="Urgent issues" value={s.urgent.length} hint="need action now" />
      </div>

      {topIssue && topIssue.negative > 0 && (
        <div className="flex items-start gap-4 rounded-2xl border border-primary/40 bg-primary/10 p-6">
          <Lightbulb className="mt-1 h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="font-display text-lg font-bold">Top decision: focus on {topIssue.name}</p>
            <p className="text-sm text-muted-foreground">
              {topIssue.negative} of {topIssue.total} {topIssue.name.toLowerCase()} comments are negative — the biggest source of unhappy customers right now.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        <Panel title="Sentiment mix" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={s.pie} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={3} stroke="none">
                {s.pie.map((p) => (
                  <Cell key={p.name} fill={SENT_COLORS[p.name]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 text-xs capitalize text-muted-foreground">
            {s.pie.map((p) => (
              <span key={p.name} className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: SENT_COLORS[p.name] }} />
                {p.name} {p.value}
              </span>
            ))}
          </div>
        </Panel>
        <Panel title="Themes by volume" className="lg:col-span-3">
          <ResponsiveContainer width="100%" height={270}>
            <BarChart data={s.cats}>
              <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} allowDecimals={false} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--secondary)" }} />
              <Bar dataKey="total" name="All" fill="var(--accent)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="negative" name="Negative" fill="var(--destructive)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <Panel title="Urgent — recommended actions">
        {s.urgent.length === 0 ? (
          <p className="text-sm text-muted-foreground">No urgent issues. Nice.</p>
        ) : (
          <ul className="divide-y divide-border">
            {s.urgent.map((f) => (
              <li key={f.id} className="grid gap-1 py-4 md:grid-cols-2 md:gap-6">
                <div>
                  <p className="text-sm font-semibold">{f.summary}</p>
                  <p className="text-xs text-muted-foreground">
                    {f.customer_name ?? "Anonymous"} · {f.category}
                  </p>
                </div>
                <p className="text-sm text-primary">→ {f.suggested_action}</p>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  color: "var(--foreground)",
};

function Kpi(p: { icon: React.ComponentType<{ className?: string }>; label: string; value: React.ReactNode; hint: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-6 ${p.accent ? "border-primary/40 bg-primary/10" : "border-border bg-card"}`}>
      <p.icon className="h-5 w-5 text-primary" />
      <p className="mt-4 font-display text-4xl font-extrabold">{p.value}</p>
      <p className="mt-1 text-sm font-medium">{p.label}</p>
      <p className="text-xs text-muted-foreground">{p.hint}</p>
    </div>
  );
}

function Panel({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-border bg-card p-6 ${className}`}>
      <h2 className="mb-4 text-lg font-bold">{title}</h2>
      {children}
    </section>
  );
}
