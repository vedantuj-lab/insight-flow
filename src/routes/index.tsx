import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BrainCircuit, LineChart, Upload, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "InsightFlow AI — Customer Intelligence & Decision Platform" },
      { name: "description", content: "Upload customer feedback, let AI find sentiment, themes and urgent issues, and get clear next actions." },
      { property: "og:title", content: "InsightFlow AI — Customer Intelligence Platform" },
      { property: "og:description", content: "Turn every customer voice into a smarter business decision." },
    ],
  }),
  component: Landing,
});

const steps = [
  { icon: Upload, title: "Collect", text: "Paste reviews, emails or upload a CSV of customer feedback." },
  { icon: BrainCircuit, title: "Analyse", text: "AI tags sentiment, category and urgency, and writes a summary." },
  { icon: LineChart, title: "Decide", text: "A live dashboard surfaces trends and the actions to take next." },
];

function Landing() {
  return (
    <div className="min-h-screen" style={{ backgroundImage: "var(--gradient-glow)" }}>
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Logo />
        <Button asChild variant="ghost">
          <Link to="/auth">Sign in</Link>
        </Button>
      </header>
      <main className="mx-auto max-w-6xl px-6">
        <section className="py-20 md:py-28">
          <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs uppercase tracking-widest text-muted-foreground">
            <Zap className="h-3 w-3 text-primary" /> Customer intelligence, automated
          </p>
          <h1 className="max-w-4xl text-5xl font-extrabold leading-[1.02] md:text-7xl">
            Turn every customer voice into a <span className="text-primary">smarter decision.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            InsightFlow reads your customer feedback, finds what matters, and tells you exactly what to fix first.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/auth">
                Start analysing <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
        <section className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border pb-px md:grid-cols-3">
          {steps.map((s, i) => (
            <div key={s.title} className="bg-background p-8">
              <div className="mb-8 flex items-center justify-between">
                <s.icon className="h-6 w-6 text-primary" />
                <span className="font-display text-sm text-muted-foreground">0{i + 1}</span>
              </div>
              <h3 className="text-2xl font-bold">{s.title}</h3>
              <p className="mt-2 text-muted-foreground">{s.text}</p>
            </div>
          ))}
        </section>
        <footer className="py-16 text-sm text-muted-foreground">InsightFlow AI · Build Battle 2026</footer>
      </main>
    </div>
  );
}

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
        <BrainCircuit className="h-4 w-4" />
      </span>
      InsightFlow<span className="text-primary">AI</span>
    </Link>
  );
}
