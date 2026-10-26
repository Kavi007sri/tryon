"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

const ease = [0.22, 1, 0.36, 1] as const;
const line1 = ["Wear", "it"];
const line2 = ["before", "you", "own", "it."];

function Word({ word, i, italic }: { word: string; i: number; italic?: boolean }) {
  return (
    <span className="inline-block overflow-hidden pb-[0.12em] align-bottom">
      <motion.span
        className={`inline-block ${italic ? "gold-text italic" : ""}`}
        initial={{ y: "110%" }}
        animate={{ y: 0 }}
        transition={{ duration: 1.1, ease, delay: 0.25 + i * 0.09 }}
      >
        {word}&nbsp;
      </motion.span>
    </span>
  );
}

export default function Hero() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const yBack = useTransform(scrollYProgress, [0, 1], [0, 140]);
  const yFront = useTransform(scrollYProgress, [0, 1], [0, -90]);
  const fade = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <section id="top" ref={ref} className="relative min-h-[100svh] overflow-hidden pt-28 pb-16">
      {/* soft radial glow */}
      <div className="pointer-events-none absolute -top-40 right-[-10%] h-[42rem] w-[42rem] rounded-full bg-[radial-gradient(circle,rgba(217,195,156,0.45),transparent_65%)] blur-2xl" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-8 lg:grid-cols-[1.1fr_0.9fr]">
        <motion.div style={{ opacity: fade }}>
          <motion.p
            className="eyebrow mb-6"
            initial={{ opacity: 0, letterSpacing: "0.6em" }}
            animate={{ opacity: 1, letterSpacing: "0.32em" }}
            transition={{ duration: 1.4, ease }}
          >
            The Virtual Fitting Room
          </motion.p>
          <h1 className="font-display text-[3.4rem] leading-[0.95] font-light sm:text-7xl lg:text-[6.2rem]">
            {line1.map((w, i) => (
              <Word key={w} word={w} i={i} />
            ))}
            <br />
            {line2.map((w, i) => (
              <Word key={w} word={w} i={i + line1.length} italic={w === "before"} />
            ))}
          </h1>
          <motion.p
            className="mt-8 max-w-md text-base leading-relaxed text-ink-soft sm:text-lg"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease, delay: 0.9 }}
          >
            Upload a portrait or step in front of your camera. Choose a piece. Our AI atelier tailors it to you in
            seconds, with your face, pose and light kept as they are.
          </motion.p>
          <motion.div
            className="mt-10 flex flex-wrap items-center gap-4"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease, delay: 1.1 }}
          >
            <a
              href="#studio"
              className="btn-lux rounded-full bg-ink px-8 py-4 text-[0.72rem] font-semibold tracking-[0.3em] text-ivory uppercase"
            >
              Enter the Atelier
            </a>
            <a
              href="#how"
              className="group flex items-center gap-3 text-[0.72rem] font-semibold tracking-[0.3em] text-ink-soft uppercase"
            >
              <span className="h-px w-8 bg-gold transition-all duration-500 group-hover:w-14" />
              How it works
            </a>
          </motion.div>
        </motion.div>

        {/* Editorial image stack */}
        <div className="relative mx-auto h-[30rem] w-full max-w-md sm:h-[36rem]">
          <motion.div
            style={{ y: yBack }}
            className="absolute top-0 left-0 w-[64%] overflow-hidden rounded-t-full rounded-b-[2rem] shadow-[0_40px_80px_-30px_rgba(22,19,17,0.45)]"
            initial={{ opacity: 0, scale: 1.08, clipPath: "inset(100% 0 0 0)" }}
            animate={{ opacity: 1, scale: 1, clipPath: "inset(0% 0 0 0)" }}
            transition={{ duration: 1.6, ease, delay: 0.3 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/samples/model-street.jpg" alt="Model" className="aspect-[2/3] w-full object-cover" />
          </motion.div>
          <motion.div
            style={{ y: yFront }}
            className="absolute right-0 bottom-4 w-[52%] rounded-[1.5rem] border border-sand bg-white p-3 shadow-[0_30px_60px_-25px_rgba(22,19,17,0.4)]"
            initial={{ opacity: 0, y: 60, rotate: 6 }}
            animate={{ opacity: 1, y: 0, rotate: -3 }}
            transition={{ duration: 1.4, ease, delay: 0.7 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/samples/garment-polo.png" alt="Garment" className="aspect-[3/4] w-full rounded-xl object-contain" />
            <p className="mt-3 text-center font-display text-lg italic">The Floral Tea Dress</p>
          </motion.div>
          <motion.div
            className="absolute top-[42%] left-[calc(54%-2rem)] flex h-16 w-16 items-center justify-center rounded-full bg-ink text-gold-soft shadow-xl"
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 140, damping: 14, delay: 1.3 }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4z" />
            </svg>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
