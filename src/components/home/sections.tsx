import { Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import heroImg from "@/assets/sloggers-france-tour.png";
import coffeeImg from "@/assets/coffee-cake.jpg";
import bikeImg from "@/assets/bike-detail.jpg";
import { submitJoinForm } from "@/lib/join-form";

export function HeroSection() {
  return (
    <section className="pt-[calc(5rem+env(safe-area-inset-top))]">
      <div className="grid lg:min-h-[calc(100svh-5rem)] lg:grid-cols-2">
        {/* Photo — sharp, no blur or overlay */}
        <div className="relative min-h-[42vh] sm:min-h-[50vh] lg:min-h-full lg:order-2">
          <img
            src={heroImg}
            alt="Southam Sloggers group ride"
            width={1200}
            height={1600}
            className="absolute inset-0 h-full w-full object-cover object-[center_30%]"
          />
        </div>

        {/* Text — solid panel, does not cover the photo */}
        <div className="flex flex-col justify-center bg-background px-6 py-12 sm:px-10 sm:py-16 lg:order-1 lg:px-12 lg:py-20">
          <div className="mx-auto w-full max-w-xl lg:mx-0">
            <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
              <span className="h-px w-10 bg-primary" />
              Southam · Warwickshire
            </div>
            <h1 className="mt-4 display text-5xl leading-[0.95] text-foreground sm:text-7xl lg:text-8xl">
              Sunday miles.
              <br />
              <span className="text-primary">Serious cake.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground">
              We're a friendly group of cyclists rolling out of Southam most Sundays — all depends
              on the weather. Good roads, good pace, and we always stop somewhere for coffee and
              cake.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/join"
                className="rounded-full bg-primary px-8 py-4 text-sm font-bold uppercase tracking-wider text-primary-foreground shadow-purple transition hover:opacity-90"
              >
                Request to join
              </Link>
              <Link
                to="/the-ride"
                className="rounded-full border border-primary/30 px-8 py-4 text-sm font-bold uppercase tracking-wider text-primary transition hover:bg-primary/5"
              >
                See the ride
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function HomeTeasersSection() {
  const links = [
    {
      to: "/about",
      label: "Who we are",
      description: "Friendly social riders. Wear your own kit — no club jersey required.",
    },
    {
      to: "/the-ride",
      label: "The ride",
      description: "Most Sundays from Southam. Steady pace, weather permitting.",
    },
    {
      to: "/coffee",
      label: "Coffee stop",
      description: "Coffee, cake, and a split kitty if you'd like to chip in at the stop.",
    },
    {
      to: "/gallery",
      label: "Gallery",
      description: "Sunday miles captured — lanes, laughs, and cafe stops.",
    },
    {
      to: "/ride",
      label: "Live ride map",
      description: "Share your location whenever the group is out. No app store needed.",
    },
    {
      to: "/join",
      label: "Join us",
      description: "Drop your details and we'll send this week's meeting point.",
    },
  ] as const;

  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="max-w-2xl">
          <div className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
            Explore
          </div>
          <h2 className="mt-3 display text-5xl leading-none md:text-6xl">
            Everything about the Sloggers.
          </h2>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {links.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="group rounded-2xl border border-border bg-card p-6 transition hover:border-primary/40 hover:shadow-soft"
            >
              <div className="display text-2xl text-primary group-hover:text-primary-glow transition-colors">
                {item.label}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export function AboutSection() {
  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6 grid gap-12 md:grid-cols-5 items-start">
        <div className="md:col-span-2">
          <div className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
            Who we are
          </div>
          <h1 className="mt-3 display text-5xl md:text-6xl leading-none">
            Whoever turns up.
            <br />
            Your kit.
          </h1>
        </div>
        <div className="md:col-span-3 space-y-6 text-lg text-muted-foreground">
          <p>
            The Sloggers started as a handful of riders who wanted a proper Sunday spin without the
            ego of a race club. A few years on, we're still going strong — plenty of us ride in
            purple, but you're free to wear whatever kit you like.
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

export function RideSection() {
  return (
    <section className="border-y border-border bg-card py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
          The ride
        </div>
        <h1 className="mt-3 display text-5xl leading-none text-foreground md:max-w-3xl md:text-7xl">
          Most Sundays. Weather permitting.
        </h1>

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
              className="rounded-2xl border border-border bg-background p-8"
            >
              <div className="text-xs uppercase tracking-widest text-primary">{c.k}</div>
              <h2 className="mt-3 display text-3xl text-foreground">{c.t}</h2>
              <p className="mt-3 text-muted-foreground">{c.d}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 overflow-hidden rounded-3xl shadow-soft">
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

export function CafeSection() {
  return (
    <section className="py-24 md:py-32">
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
          <h1 className="mt-3 display text-5xl md:text-7xl leading-none">
            Coffee.
            <br />
            <span className="text-primary">Cake.</span>
            <br />
            Repeat.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            Every ride, we roll into a local cafe for the reward we've all been thinking about
            since the first climb — not always halfway round, but always part of the plan. Flat
            white in one hand, Victoria sponge in the other. This is the bit non-cyclists don't
            understand.
          </p>
          <p className="mt-4 text-lg text-muted-foreground">
            We run a split kitty at the cafe stop — chip in if you'd like to join in, no pressure
            either way.
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

export function JoinSection() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [form, setForm] = useState({ name: "", email: "", phone: "", experience: "", message: "" });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    setErrorMessage("");

    try {
      await submitJoinForm(form);
      setStatus("sent");
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Something went wrong. Please try again.",
      );
    }
  };

  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
          Join the Sloggers
        </div>
        <h1 className="mt-3 display max-w-3xl text-5xl leading-none text-foreground md:text-7xl">
          Fancy a Sunday spin with us?
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
          Drop your details in and one of us will get back to you with this Sunday's meeting point.
          First ride's on us — well, the ride part anyway. You buy your own cake.
        </p>

        {status === "sent" ? (
          <div className="mt-12 rounded-3xl border border-border bg-card p-10 text-center shadow-soft">
            <div className="display text-4xl text-foreground">You're in the group chat.</div>
            <p className="mt-3 text-muted-foreground">
              We'll be in touch shortly with details for this Sunday. See you on the start line.
            </p>
          </div>
        ) : (
          <form
            onSubmit={submit}
            className="mt-12 grid gap-4 rounded-3xl border border-border bg-card p-6 shadow-soft md:grid-cols-2 md:p-8"
          >
            <JoinInput
              label="Name"
              value={form.name}
              onChange={(v) => setForm({ ...form, name: v })}
              required
            />
            <JoinInput
              label="Email"
              type="email"
              value={form.email}
              onChange={(v) => setForm({ ...form, email: v })}
              required
            />
            <JoinInput
              label="Mobile phone"
              type="tel"
              value={form.phone}
              onChange={(v) => setForm({ ...form, phone: v })}
              placeholder="07xxx xxxxxx"
              required
            />
            <div>
              <label className="mb-2 block text-xs uppercase tracking-widest text-muted-foreground">
                Riding experience
              </label>
              <select
                value={form.experience}
                onChange={(e) => setForm({ ...form, experience: e.target.value })}
                required
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="" className="text-foreground">
                  Select one…
                </option>
                <option value="new" className="text-foreground">
                  New to road cycling
                </option>
                <option value="returning" className="text-foreground">
                  Returning after a break
                </option>
                <option value="regular" className="text-foreground">
                  Ride weekly
                </option>
                <option value="strong" className="text-foreground">
                  Strong club rider
                </option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="mb-2 block text-xs uppercase tracking-widest text-muted-foreground">
                Anything we should know?
              </label>
              <textarea
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                rows={4}
                maxLength={500}
                placeholder="Bike setup, favourite cake, anything at all…"
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="md:col-span-2">
              {errorMessage ? (
                <p className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {errorMessage}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={status === "sending"}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-10 py-4 text-sm font-bold uppercase tracking-wider text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70 md:w-auto"
              >
                {status === "sending" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending…
                  </>
                ) : (
                  "Send my request"
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}

function JoinInput({
  label,
  value,
  onChange,
  type = "text",
  required,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs uppercase tracking-widest text-muted-foreground">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        maxLength={120}
        className="w-full rounded-xl border border-input bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
      />
    </div>
  );
}
