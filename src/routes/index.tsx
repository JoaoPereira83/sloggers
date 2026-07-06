import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import heroImg from "@/assets/sloggers-france-tour.png";
import coffeeImg from "@/assets/coffee-cake.jpg";
import bikeImg from "@/assets/bike-detail.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Southam Sloggers — Sunday Cycling Club, Warwickshire" },
      {
        name: "description",
        content:
          "Southam Sloggers is a friendly Sunday cycling group based in Southam, Warwickshire. Rolling roads, good pace, and a proper coffee-and-cake stop. Come and ride with us.",
      },
      { property: "og:title", content: "Southam Sloggers — Sunday Cycling Club" },
      {
        property: "og:description",
        content: "Sunday rides from Southam, Warwickshire. Coffee. Cake. Good company.",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@300;400;500;600;700&display=swap",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <Hero />
      <About />
      <Ride />
      <Cafe />
      <Join />
      <Footer />
    </div>
  );
}

function Nav() {
  return (
    <header className="fixed top-0 z-50 w-full bg-background/80 backdrop-blur-md border-b border-border/50">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <a href="#top" className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full bg-primary" />
          <span className="display text-2xl tracking-wider text-primary">Southam Sloggers</span>
        </a>
        <div className="hidden gap-8 md:flex text-sm font-medium uppercase tracking-wider">
          <a href="#about" className="hover:text-primary transition-colors">Who we are</a>
          <a href="#ride" className="hover:text-primary transition-colors">The ride</a>
          <a href="#cafe" className="hover:text-primary transition-colors">Coffee stop</a>
          <Link to="/gallery" className="hover:text-primary transition-colors">Gallery</Link>
          <Link to="/ride" className="hover:text-primary transition-colors">Ride map</Link>
          <a href="#join" className="hover:text-primary transition-colors">Join us</a>
        </div>
        <a
          href="#join"
          className="rounded-full bg-primary px-5 py-2 text-sm font-semibold uppercase tracking-wider text-primary-foreground hover:opacity-90 transition"
        >
          Ride with us
        </a>
      </nav>
    </header>
  );
}

function Hero() {
  return (
    <section id="top" className="relative min-h-screen flex items-end overflow-hidden pt-20">
      <img
        src={heroImg}
        alt="Southam Sloggers on the France tour"
        width={1200}
        height={1600}
        className="absolute inset-0 h-full w-full object-cover object-center"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-primary-deep via-primary-deep/70 to-primary-deep/30" />
      <div className="absolute inset-0 bg-gradient-to-r from-primary-deep/85 via-primary-deep/40 to-transparent" />
      <div className="relative mx-auto w-full max-w-7xl px-6 pb-20 pt-40">
        <div className="max-w-2xl rounded-3xl border border-primary-foreground/10 bg-primary-deep/75 px-8 py-10 shadow-purple backdrop-blur-md">
          <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.3em] text-primary-glow">
            <span className="h-px w-10 bg-primary-glow" />
            Southam · Warwickshire
          </div>
          <h1 className="mt-4 display text-6xl leading-[0.95] text-primary-foreground drop-shadow-sm sm:text-8xl md:text-9xl">
            Sunday miles.
            <br />
            <span className="text-primary-glow">Serious cake.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg font-medium leading-relaxed text-primary-foreground">
            We're a friendly group of cyclists rolling out of Southam most Sundays — all depends
            on the weather. Good roads, good pace, and we always stop somewhere for coffee and
            cake.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <a
              href="#join"
              className="rounded-full bg-primary-glow px-8 py-4 text-sm font-bold uppercase tracking-wider text-primary-deep hover:opacity-90 transition shadow-purple"
            >
              Request to join
            </a>
            <a
              href="#ride"
              className="rounded-full border border-primary-foreground/40 px-8 py-4 text-sm font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary-foreground/10 transition"
            >
              See the ride
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function About() {
  return (
    <section id="about" className="py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6 grid gap-12 md:grid-cols-5 items-start">
        <div className="md:col-span-2">
          <div className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
            Who we are
          </div>
          <h2 className="mt-3 display text-5xl md:text-6xl leading-none">
            Whoever turns up.<br />One kit.
          </h2>
        </div>
        <div className="md:col-span-3 space-y-6 text-lg text-muted-foreground">
          <p>
            The Sloggers started as a handful of riders who wanted a proper Sunday spin without the
            ego of a race club. A few years on, we're still going strong — and yes, we all wear the
            purple.
          </p>
          <p>
            We're social riders first. Who turns up changes week to week — weather, plans, and
            life all play a part — but we never leave anyone behind. Nobody's late back for lunch,
            and the hardest decision of the day is usually which cake to order.
          </p>
          <div className="grid gap-6 pt-6 sm:grid-cols-3">
            {[
              {
                t: "Turnout",
                d: "A friendly group, most Sundays — whenever the weather and diaries allow.",
              },
              {
                t: "Pace",
                d: "Steady and social. We regroup often and ride as one.",
              },
              {
                t: "Promise",
                d: "We never leave anyone behind. Ever.",
              },
            ].map((s) => (
              <div key={s.t} className="border-t border-border pt-4">
                <div className="display text-2xl text-primary">{s.t}</div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Ride() {
  return (
    <section id="ride" className="relative py-24 md:py-32 bg-primary-deep text-primary-foreground overflow-hidden">
      <div className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 30%, oklch(0.62 0.22 315) 0%, transparent 40%), radial-gradient(circle at 80% 70%, oklch(0.72 0.19 335) 0%, transparent 40%)`,
        }}
      />
      <div className="relative mx-auto max-w-7xl px-6">
        <div className="text-xs font-semibold uppercase tracking-[0.3em] text-primary-glow">
          The ride
        </div>
        <h2 className="mt-3 display text-5xl md:text-7xl max-w-3xl leading-none">
          Most Sundays. Weather permitting.
        </h2>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {[
            {
              t: "Where",
              d: "Rolling out from Southam, Warwickshire. The route changes each week — we pick lanes that suit the wind and keep the ride enjoyable.",
              k: "From Southam",
            },
            {
              t: "When",
              d: "Most Sunday mornings, weather permitting. Check in with the group if you're planning to join.",
              k: "Most Sundays",
            },
            {
              t: "Pace",
              d: "Steady social pace. Regroup at the top of every climb. We never leave anyone behind.",
              k: "Social · Steady",
            },
          ].map((c) => (
            <div
              key={c.t}
              className="rounded-2xl border border-primary-foreground/15 bg-primary-foreground/5 p-8 backdrop-blur-sm"
            >
              <div className="text-xs uppercase tracking-widest text-primary-glow">{c.k}</div>
              <h3 className="mt-3 display text-3xl">{c.t}</h3>
              <p className="mt-3 text-primary-foreground/75">{c.d}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 overflow-hidden rounded-3xl shadow-purple">
          <img
            src={bikeImg}
            alt="Close up of a road bike"
            loading="lazy"
            width={1280}
            height={960}
            className="w-full h-64 md:h-80 object-cover"
          />
        </div>
      </div>
    </section>
  );
}

function Cafe() {
  return (
    <section id="cafe" className="py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6 grid gap-12 md:grid-cols-2 items-center">
        <div className="overflow-hidden rounded-3xl shadow-soft order-2 md:order-1">
          <img
            src={coffeeImg}
            alt="Coffee and cake at the cafe stop"
            loading="lazy"
            width={1280}
            height={960}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="order-1 md:order-2">
          <div className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
            The important bit
          </div>
          <h2 className="mt-3 display text-5xl md:text-7xl leading-none">
            Coffee.<br />
            <span className="text-primary">Cake.</span><br />
            Repeat.
          </h2>
          <p className="mt-6 text-lg text-muted-foreground">
            Every ride, we roll into a local cafe for the reward we've all been thinking about
            since the first climb — not always halfway round, but always part of the plan. Flat
            white in one hand, Victoria sponge in the other. This is the bit non-cyclists don't
            understand.
          </p>
          <blockquote className="mt-8 border-l-4 border-primary pl-6 italic text-xl text-foreground">
            "The ride is the excuse. The cake is the reason."
            <div className="mt-2 not-italic text-sm uppercase tracking-widest text-muted-foreground">
              — Every Slogger, ever
            </div>
          </blockquote>
        </div>
      </div>
    </section>
  );
}

function Join() {
  const [status, setStatus] = useState<"idle" | "sent">("idle");
  const [form, setForm] = useState({ name: "", email: "", experience: "", message: "" });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sent");
  };

  return (
    <section id="join" className="py-24 md:py-32 bg-hero-gradient text-primary-foreground">
      <div className="mx-auto max-w-5xl px-6">
        <div className="text-xs font-semibold uppercase tracking-[0.3em] text-primary-glow">
          Join the Sloggers
        </div>
        <h2 className="mt-3 display text-5xl md:text-7xl leading-none max-w-3xl">
          Fancy a Sunday spin with us?
        </h2>
        <p className="mt-6 max-w-2xl text-lg text-primary-foreground/80">
          Drop your details in and one of us will get back to you with this Sunday's meeting point.
          First ride's on us — well, the ride part anyway. You buy your own cake.
        </p>

        {status === "sent" ? (
          <div className="mt-12 rounded-3xl bg-primary-foreground/10 border border-primary-foreground/20 p-10 text-center backdrop-blur">
            <div className="display text-4xl">You're in the group chat.</div>
            <p className="mt-3 text-primary-foreground/80">
              We'll be in touch shortly with details for this Sunday. See you on the start line.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-12 grid gap-4 md:grid-cols-2">
            <Input
              label="Name"
              value={form.name}
              onChange={(v) => setForm({ ...form, name: v })}
              required
            />
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(v) => setForm({ ...form, email: v })}
              required
            />
            <div className="md:col-span-2">
              <label className="block text-xs uppercase tracking-widest text-primary-glow mb-2">
                Riding experience
              </label>
              <select
                value={form.experience}
                onChange={(e) => setForm({ ...form, experience: e.target.value })}
                required
                className="w-full rounded-xl bg-primary-foreground/10 border border-primary-foreground/20 px-4 py-3 text-primary-foreground placeholder:text-primary-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary-glow"
              >
                <option value="" className="text-foreground">Select one…</option>
                <option value="new" className="text-foreground">New to road cycling</option>
                <option value="returning" className="text-foreground">Returning after a break</option>
                <option value="regular" className="text-foreground">Ride weekly</option>
                <option value="strong" className="text-foreground">Strong club rider</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs uppercase tracking-widest text-primary-glow mb-2">
                Anything we should know?
              </label>
              <textarea
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                rows={4}
                maxLength={500}
                placeholder="Bike setup, favourite cake, anything at all…"
                className="w-full rounded-xl bg-primary-foreground/10 border border-primary-foreground/20 px-4 py-3 text-primary-foreground placeholder:text-primary-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary-glow"
              />
            </div>
            <div className="md:col-span-2">
              <button
                type="submit"
                className="w-full md:w-auto rounded-full bg-primary-glow px-10 py-4 text-sm font-bold uppercase tracking-wider text-primary-deep hover:opacity-90 transition shadow-purple"
              >
                Send my request
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-widest text-primary-glow mb-2">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        maxLength={120}
        className="w-full rounded-xl bg-primary-foreground/10 border border-primary-foreground/20 px-4 py-3 text-primary-foreground placeholder:text-primary-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary-glow"
      />
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border py-10">
      <div className="mx-auto max-w-7xl px-6 flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-primary" />
          <span className="display tracking-wider text-primary text-lg">Southam Sloggers</span>
          <span>· Southam, Warwickshire</span>
        </div>
        <div>© {new Date().getFullYear()} Southam Sloggers CC</div>
      </div>
    </footer>
  );
}
