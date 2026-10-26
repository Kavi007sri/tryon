"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

const MESSAGES = [
  "Taking your measurements",
  "Studying the fabric",
  "Cutting the pattern",
  "Draping the garment",
  "Pressing the seams",
  "Adjusting the light",
  "Final fitting",
];

type Props = {
  status: "idle" | "loading" | "done" | "error";
  before: string | null;
  after: string | null;
  error: string | null;
  onRetry: () => void;
  onCancel: () => void;
  /** Which AI model produced the result, shown under the actions */
  model?: string | null;
};

function Compare({ before, after }: { before: string; after: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(50);
  const [dragging, setDragging] = useState(false);

  const move = (clientX: number) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    setPos(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)));
  };

  return (
    <div
      ref={ref}
      className="relative h-full w-full cursor-ew-resize touch-none select-none"
      onPointerDown={(e) => {
        setDragging(true);
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        move(e.clientX);
      }}
      onPointerMove={(e) => dragging && move(e.clientX)}
      onPointerUp={() => setDragging(false)}
      onPointerCancel={() => setDragging(false)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={after} alt="After" className="absolute inset-0 h-full w-full object-contain" draggable={false} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={before}
        alt="Before"
        className="absolute inset-0 h-full w-full object-contain"
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
        draggable={false}
      />
      <div className="pointer-events-none absolute inset-y-0" style={{ left: `${pos}%` }}>
        <div className="absolute inset-y-0 -left-px w-0.5 bg-ivory shadow-[0_0_12px_rgba(0,0,0,0.35)]" />
        <div
          role="slider"
          tabIndex={0}
          aria-label="Before and after"
          aria-valuenow={Math.round(pos)}
          aria-valuemin={0}
          aria-valuemax={100}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") setPos((p) => Math.max(0, p - 5));
            if (e.key === "ArrowRight") setPos((p) => Math.min(100, p + 5));
          }}
          className="pointer-events-auto absolute top-1/2 -left-6 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-ivory text-ink shadow-xl"
        >
          ‹ ›
        </div>
      </div>
      <span className="absolute top-4 left-4 rounded-full bg-ink/70 px-3 py-1 text-[0.6rem] font-semibold tracking-[0.25em] text-ivory uppercase backdrop-blur">
        Before
      </span>
      <span className="absolute top-4 right-4 rounded-full bg-gold/90 px-3 py-1 text-[0.6rem] font-semibold tracking-[0.25em] text-ink uppercase backdrop-blur">
        After
      </span>
    </div>
  );
}

export default function ResultView({ status, before, after, error, onRetry, onCancel, model }: Props) {
  const [msg, setMsg] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (status !== "loading") return;
    setMsg(0);
    setElapsed(0);
    const a = setInterval(() => setMsg((m) => (m + 1) % MESSAGES.length), 2400);
    const b = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => {
      clearInterval(a);
      clearInterval(b);
    };
  }, [status]);

  return (
    <div className="flex flex-col">
      <div className="mb-4">
        <p className="eyebrow">III · The Fitting</p>
        <h3 className="mt-1 font-display text-3xl">Your look</h3>
      </div>
      <div className="relative aspect-[3/4] overflow-hidden rounded-[1.75rem] border border-sand bg-ink">
        <AnimatePresence mode="wait">
          {status === "idle" && (
            <motion.div
              key="idle"
              className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 text-center text-ivory/70"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="h-20 w-20 rounded-full border border-gold-soft/40"
                animate={{ scale: [1, 1.08, 1], opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
              />
              <p className="font-display text-2xl text-ivory">Awaiting your fitting</p>
              <p className="max-w-[15rem] text-sm">Add your photo and a garment, then press “Try it on”.</p>
            </motion.div>
          )}

          {status === "loading" && (
            <motion.div
              key="loading"
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {before && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={before}
                  alt=""
                  className="absolute inset-0 h-full w-full scale-105 object-cover opacity-50 blur-md"
                />
              )}
              <div className="scan-line" />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-ink/40 p-6 text-center">
                <span className="h-12 w-12 animate-spin rounded-full border border-gold-soft border-t-transparent [animation-duration:1.4s]" />
                <AnimatePresence mode="wait">
                  <motion.p
                    key={msg}
                    className="font-display text-2xl text-ivory italic"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.5 }}
                  >
                    {MESSAGES[msg]}…
                  </motion.p>
                </AnimatePresence>
                <p className="text-[0.65rem] tracking-[0.3em] text-ivory/60 uppercase">{elapsed}s · usually 10–25s</p>
                <button
                  onClick={onCancel}
                  className="mt-2 rounded-full border border-white/25 px-5 py-2 text-[0.6rem] font-semibold tracking-[0.25em] text-ivory uppercase transition hover:bg-white/10"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}

          {status === "done" && before && after && (
            <motion.div
              key="done"
              className="absolute inset-0 bg-ivory"
              initial={{ opacity: 0, clipPath: "inset(0 0 100% 0)" }}
              animate={{ opacity: 1, clipPath: "inset(0 0 0% 0)" }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
            >
              <Compare before={before} after={after} />
            </motion.div>
          )}

          {status === "error" && (
            <motion.div
              key="error"
              className="absolute inset-0 flex flex-col items-center justify-center gap-5 p-8 text-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <p className="font-display text-3xl text-ivory">A small alteration needed</p>
              <p className="max-w-xs text-sm leading-relaxed text-ivory/70">{error}</p>
              <button
                onClick={onRetry}
                className="rounded-full bg-gold px-6 py-3 text-[0.65rem] font-semibold tracking-[0.25em] text-ink uppercase transition hover:bg-gold-soft"
              >
                Try again
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {status === "done" && after && (
          <motion.div
            className="mt-4 flex flex-wrap gap-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.6 }}
          >
            <a
              href={after}
              download="maison-atelier-tryon.png"
              className="btn-lux rounded-full bg-ink px-6 py-3 text-[0.65rem] font-semibold tracking-[0.25em] text-ivory uppercase"
            >
              Download
            </a>
            <button
              onClick={onRetry}
              className="rounded-full border border-ink px-6 py-3 text-[0.65rem] font-semibold tracking-[0.25em] uppercase transition-colors duration-500 hover:bg-ink hover:text-ivory"
            >
              Regenerate
            </button>
            {model && (
              <p className="w-full text-[0.6rem] tracking-[0.2em] text-muted uppercase">
                Made with {model.replace(/^google\//, "")}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
