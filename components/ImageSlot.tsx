"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRef, useState } from "react";
import type { PreparedImage } from "@/lib/image";

type Sample = { src: string; label: string };

type Props = {
  step: string;
  title: string;
  hint: string;
  image: PreparedImage | null;
  samples: Sample[];
  busy?: boolean;
  onFile: (file: File) => void;
  onSample: (src: string) => void;
  onCamera: () => void;
  onClear: () => void;
};

export default function ImageSlot({ step, title, hint, image, samples, busy, onFile, onSample, onCamera, onClear }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  return (
    <div className="flex flex-col">
      <div className="mb-4 flex items-baseline justify-between">
        <div>
          <p className="eyebrow">{step}</p>
          <h3 className="mt-1 font-display text-3xl">{title}</h3>
        </div>
        {image && (
          <button
            onClick={onClear}
            className="text-[0.65rem] font-semibold tracking-[0.25em] text-muted uppercase transition hover:text-rose"
          >
            Remove
          </button>
        )}
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const f = e.dataTransfer.files?.[0];
          if (f) onFile(f);
        }}
        className={`relative aspect-[3/4] overflow-hidden rounded-[1.75rem] border transition-all duration-500 ${
          drag ? "scale-[1.01] border-gold bg-gold-soft/20" : "border-sand bg-white/60"
        }`}
      >
        <AnimatePresence mode="wait">
          {image ? (
            <motion.img
              key={image.url}
              src={image.url}
              alt={title}
              className="absolute inset-0 h-full w-full object-contain p-2"
              initial={{ opacity: 0, scale: 1.05, filter: "blur(8px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            />
          ) : (
            <motion.div
              key="empty"
              className="absolute inset-0 flex flex-col items-center justify-center gap-5 p-6 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-gold/50 text-gold-deep">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3">
                  <path d="M12 16V4m0 0l-4 4m4-4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
                </svg>
              </div>
              <p className="max-w-[16rem] text-sm leading-relaxed text-muted">{hint}</p>
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  onClick={() => inputRef.current?.click()}
                  className="btn-lux rounded-full bg-ink px-5 py-3 text-[0.65rem] font-semibold tracking-[0.25em] text-ivory uppercase"
                >
                  Upload
                </button>
                <button
                  onClick={onCamera}
                  className="flex items-center gap-2 rounded-full border border-ink px-5 py-3 text-[0.65rem] font-semibold tracking-[0.25em] uppercase transition-colors duration-500 hover:bg-ink hover:text-ivory"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M3 8a2 2 0 012-2h2l2-2h6l2 2h2a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                    <circle cx="12" cy="13" r="3.5" />
                  </svg>
                  Camera
                </button>
              </div>
              <p className="text-[0.65rem] tracking-[0.2em] text-muted/70 uppercase">or drop an image here</p>
            </motion.div>
          )}
        </AnimatePresence>

        {busy && <div className="shimmer absolute inset-0 bg-cream/60" />}

        {image && (
          <div className="absolute right-3 bottom-3 flex gap-2">
            <button
              onClick={() => inputRef.current?.click()}
              className="rounded-full bg-white/90 px-4 py-2 text-[0.6rem] font-semibold tracking-[0.2em] uppercase shadow backdrop-blur transition hover:bg-white"
            >
              Replace
            </button>
            <button
              onClick={onCamera}
              className="rounded-full bg-white/90 px-4 py-2 text-[0.6rem] font-semibold tracking-[0.2em] uppercase shadow backdrop-blur transition hover:bg-white"
            >
              Camera
            </button>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />

      {samples.length > 0 && (
        <div className="mt-4 flex items-center gap-3">
          <span className="text-[0.6rem] font-semibold tracking-[0.25em] text-muted uppercase">Samples</span>
          {samples.map((s) => (
            <button
              key={s.src}
              onClick={() => onSample(s.src)}
              title={s.label}
              className="h-14 w-11 overflow-hidden rounded-lg border border-sand transition duration-500 hover:-translate-y-0.5 hover:border-gold hover:shadow-md"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.src} alt={s.label} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
