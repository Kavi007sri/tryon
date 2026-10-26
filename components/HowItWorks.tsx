"use client";

import { motion } from "framer-motion";

const steps = [
  {
    n: "I",
    title: "Present yourself",
    body: "Upload a clear, front-facing photo, or open your camera and take one now. Full-length works best for dresses.",
  },
  {
    n: "II",
    title: "Choose the piece",
    body: "Drop in any product shot or flat lay, from any boutique. Tell us whether it's a top, bottom, dress or coat.",
  },
  {
    n: "III",
    title: "Be fitted",
    body: "Gemini tailors the garment to your figure, keeping your face, pose and light as they are. Compare, download, repeat.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how" className="border-y border-sand/70 bg-cream/60 px-4 py-24 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          className="mb-16 max-w-xl"
        >
          <p className="eyebrow mb-4">The Ritual</p>
          <h2 className="font-display text-5xl font-light sm:text-6xl">
            Three steps, <span className="italic text-gold-deep">one fitting.</span>
          </h2>
        </motion.div>
        <div className="grid gap-px overflow-hidden rounded-[2rem] bg-sand md:grid-cols-3">
          {steps.map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: i * 0.15 }}
              className="group bg-ivory p-10 transition-colors duration-700 hover:bg-white"
            >
              <span className="font-display text-6xl font-light text-gold transition-transform duration-700 group-hover:-translate-y-1 inline-block">
                {s.n}
              </span>
              <h3 className="mt-6 font-display text-3xl">{s.title}</h3>
              <p className="mt-3 leading-relaxed text-ink-soft">{s.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
