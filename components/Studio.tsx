"use client";

import { motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { prepareImage, type PreparedImage } from "@/lib/image";
import { loadPuter, puterTryOn, signIn } from "@/lib/puter";
import CameraModal from "./CameraModal";
import ImageSlot from "./ImageSlot";
import ResultView from "./ResultView";

const TYPES = [
  { id: "top", label: "Top" },
  { id: "bottom", label: "Bottom" },
  { id: "dress", label: "Dress" },
  { id: "outerwear", label: "Outerwear" },
  { id: "full", label: "Full look" },
] as const;
type GarmentType = (typeof TYPES)[number]["id"];

const PERSON_SAMPLES = [{ src: "/samples/model-street.jpg", label: "Full length" }];
// `type` is selected automatically when the sample is picked
const GARMENT_SAMPLES: { src: string; label: string; type: GarmentType }[] = [
  { src: "/samples/garment-polo.png", label: "Floral tea dress", type: "dress" },
];

type Status = "idle" | "loading" | "done" | "error";

// "puter" (default): runs in the browser via Puter.js, no API key needed.
// "server": uses /api/tryon with the Gemini / Vertex credentials in .env.local.
const PROVIDER = process.env.NEXT_PUBLIC_TRYON_PROVIDER === "server" ? "server" : "puter";

async function serverTryOn(form: FormData, signal: AbortSignal): Promise<{ image: string; model: string }> {
  const res = await fetch("/api/tryon", { method: "POST", body: form, signal });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.image) throw new Error(data.error || `Request failed (${res.status}).`);
  return { image: data.image, model: data.model ?? "" };
}

export default function Studio() {
  const [person, setPerson] = useState<PreparedImage | null>(null);
  const [garment, setGarment] = useState<PreparedImage | null>(null);
  const [preparing, setPreparing] = useState<"person" | "garment" | null>(null);
  const [type, setType] = useState<GarmentType>("top");
  const [notes, setNotes] = useState("");
  const [camera, setCamera] = useState<"person" | "garment" | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<string | null>(null);
  const [resultModel, setResultModel] = useState<string | null>(null);
  // The person photo the current result was made from, so the before/after slider stays aligned
  const [resultBefore, setResultBefore] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  // Preload Puter.js so the sign-in popup can open straight from the button click
  useEffect(() => {
    if (PROVIDER === "puter") loadPuter().catch(() => {});
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const load = useCallback(async (slot: "person" | "garment", source: string | Blob) => {
    setPreparing(slot);
    try {
      const img = await prepareImage(source);
      (slot === "person" ? setPerson : setGarment)(img);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Could not read this image.");
    } finally {
      setPreparing(null);
    }
  }, []);

  const onFile = (slot: "person" | "garment") => (file: File) => {
    if (!file.type.startsWith("image/")) return setToast("Please choose an image file.");
    if (file.size > 25 * 1024 * 1024) return setToast("That image is over 25 MB.");
    load(slot, file);
  };

  const generate = useCallback(async () => {
    if (!person || !garment) return;
    if (PROVIDER === "puter") {
      try {
        await signIn();
      } catch (e) {
        setToast(e instanceof Error ? e.message : "Sign-in failed.");
        return;
      }
    }
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setStatus("loading");
    setError(null);
    if (window.innerWidth < 1024) resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });

    const aspect = person.width / person.height;

    try {
      let image: string;
      let model: string;
      if (PROVIDER === "puter") {
        const testMode = new URLSearchParams(window.location.search).has("puterTest");
        ({ image, model } = await puterTryOn({
          person: person.blob,
          garment: garment.blob,
          type,
          notes: notes.trim(),
          aspect,
          testMode,
        }));
        // Puter calls can't be aborted; ignore the result if the user cancelled meanwhile
        if (ctrl.signal.aborted) return;
      } else {
        const form = new FormData();
        form.append("person", person.blob, "person.jpg");
        form.append("garment", garment.blob, "garment.jpg");
        form.append("type", type);
        form.append("notes", notes.trim());
        form.append("aspect", String(aspect));
        ({ image, model } = await serverTryOn(form, ctrl.signal));
      }
      setResult(image);
      setResultModel(model);
      setResultBefore(person.url);
      setStatus("done");
    } catch (e) {
      if (ctrl.signal.aborted) return;
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setStatus("error");
    }
  }, [person, garment, type, notes]);

  const cancel = () => {
    abortRef.current?.abort();
    setStatus(result ? "done" : "idle");
  };

  const ready = !!person && !!garment && status !== "loading";

  return (
    <section id="studio" className="px-4 py-24 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          className="mb-14 flex flex-col justify-between gap-6 md:flex-row md:items-end"
        >
          <div>
            <p className="eyebrow mb-4">The Atelier</p>
            <h2 className="font-display text-5xl font-light sm:text-6xl">
              Your private <span className="italic text-gold-deep">fitting room.</span>
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-ink-soft">
            {PROVIDER === "puter"
              ? "Free to use: you'll be asked to sign in with a free Puter account on your first fitting. "
              : "Photos are sent securely to the AI and never stored. "}
            For best results, use a well-lit, front-facing photo and a clear image of the garment.
          </p>
        </motion.div>

        <div className="grid gap-10 lg:grid-cols-3">
          {[
            <ImageSlot
              key="p"
              step="I · You"
              title="Your photo"
              hint="A clear, front-facing photo. Full length for dresses and bottoms."
              image={person}
              samples={PERSON_SAMPLES}
              busy={preparing === "person"}
              onFile={onFile("person")}
              onSample={(s) => load("person", s)}
              onCamera={() => setCamera("person")}
              onClear={() => setPerson(null)}
            />,
            <div key="g" className="flex flex-col">
              <ImageSlot
                step="II · The Piece"
                title="The garment"
                hint="A product shot, flat lay, or photo of the garment on someone else."
                image={garment}
                samples={GARMENT_SAMPLES}
                busy={preparing === "garment"}
                onFile={onFile("garment")}
                onSample={(s) => {
                  const sample = GARMENT_SAMPLES.find((g) => g.src === s);
                  if (sample) setType(sample.type);
                  load("garment", s);
                }}
                onCamera={() => setCamera("garment")}
                onClear={() => setGarment(null)}
              />
            </div>,
            <div key="r" ref={resultRef}>
              <ResultView
                status={status}
                before={status === "done" ? resultBefore : (person?.url ?? null)}
                after={result}
                error={error}
                onRetry={generate}
                onCancel={cancel}
                model={resultModel}
              />
            </div>,
          ].map((el, i) => (
            <motion.div
              key={i}
              // On mobile the result sits below the controls; on desktop it's the third column
              className={i === 2 ? "order-4 lg:order-none" : ""}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: i * 0.12 }}
            >
              {el}
            </motion.div>
          ))}

          {/* Controls */}
          <div className="order-3 lg:order-none lg:col-span-3">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
              className="grid gap-8 rounded-[2rem] border border-sand bg-white/70 p-6 shadow-[0_30px_60px_-40px_rgba(22,19,17,0.35)] backdrop-blur sm:p-8 lg:grid-cols-[auto_1fr_auto] lg:items-end"
            >
              <div>
                <p className="eyebrow mb-3">Garment type</p>
                <div className="flex flex-wrap gap-2">
                  {TYPES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setType(t.id)}
                      className={`relative rounded-full px-5 py-2.5 text-[0.7rem] font-semibold tracking-[0.2em] uppercase transition-colors duration-300 ${
                        type === t.id ? "text-ivory" : "text-ink-soft hover:text-ink"
                      }`}
                    >
                      {type === t.id && (
                        <motion.span
                          layoutId="type-pill"
                          className="absolute inset-0 rounded-full bg-ink"
                          transition={{ type: "spring", stiffness: 380, damping: 32 }}
                        />
                      )}
                      <span className="relative">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <label className="block">
                <span className="eyebrow mb-3 block">Styling note (optional)</span>
                <input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={300}
                  placeholder="e.g. tucked in, sleeves rolled up, oversized fit"
                  className="w-full border-b border-sand bg-transparent py-2.5 text-sm outline-none transition placeholder:text-muted/60 focus:border-gold"
                />
              </label>

              <button
                onClick={generate}
                disabled={!ready}
                className="btn-lux group flex items-center justify-center gap-3 rounded-full bg-ink px-10 py-5 text-[0.72rem] font-semibold tracking-[0.3em] text-ivory uppercase transition disabled:cursor-not-allowed disabled:opacity-35"
              >
                {status === "loading" ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border border-ivory border-t-transparent" />
                    Fitting…
                  </>
                ) : (
                  <>
                    Try it on
                    <span className="transition-transform duration-500 group-hover:translate-x-1">→</span>
                  </>
                )}
              </button>
            </motion.div>
            {status !== "loading" && (
              <p className="mt-4 text-center text-xs tracking-[0.2em] text-muted uppercase">
                {!person && !garment
                  ? "Add your photo and a garment to begin"
                  : !person
                    ? "Add your photo to begin"
                    : !garment
                      ? "Add a garment to begin"
                      : PROVIDER === "puter"
                        ? "Free · AI by Gemini via Puter"
                        : "Ready when you are"}
              </p>
            )}
          </div>
        </div>
      </div>

      <CameraModal
        open={camera !== null}
        title={camera === "garment" ? "Photograph the garment" : "Take your photo"}
        guide={camera === "person"}
        onClose={() => setCamera(null)}
        onCapture={(img) => {
          (camera === "garment" ? setGarment : setPerson)(img);
        }}
      />

      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[80] flex justify-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md rounded-full bg-ink px-6 py-3 text-center text-sm text-ivory shadow-xl"
          >
            {toast}
          </motion.div>
        </div>
      )}
    </section>
  );
}
