"use client";

import { buildPrompt, nearestRatio, type GarmentType } from "./prompt";

/** Minimal typing for the parts of Puter.js we use (https://docs.puter.com). */
type Puter = {
  auth: {
    isSignedIn(): boolean;
    signIn(): Promise<unknown>;
  };
  ai: {
    txt2img(prompt: string, options: Record<string, unknown>): Promise<HTMLImageElement>;
  };
};

declare global {
  interface Window {
    puter?: Puter;
  }
}

const SCRIPT_SRC = "https://js.puter.com/v2/";
// Tried in order; the next one is used only if a model is unknown/unavailable
const MODELS = ["gemini-nano-banana-2.1", "gemini-3-pro-image", "gemini-3.1-flash-image"];

let loading: Promise<Puter> | null = null;

/** Inject the Puter.js script once. Call early (on page load) so sign-in can run inside the click handler. */
export function loadPuter(): Promise<Puter> {
  if (typeof window === "undefined") return Promise.reject(new Error("Puter.js runs in the browser only."));
  if (window.puter) return Promise.resolve(window.puter);
  if (!loading) {
    loading = new Promise<Puter>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = SCRIPT_SRC;
      script.async = true;
      script.onload = () =>
        window.puter ? resolve(window.puter) : reject(new Error("Puter.js failed to initialise."));
      script.onerror = () => {
        loading = null;
        reject(new Error("Could not load Puter.js. Check your internet connection or ad-blocker."));
      };
      document.head.appendChild(script);
    });
  }
  return loading;
}

export function isPuterReady(): boolean {
  return typeof window !== "undefined" && !!window.puter;
}

export function isSignedIn(): boolean {
  return !!window.puter?.auth.isSignedIn();
}

/** Must be called directly from a click handler: it opens a popup. */
export async function signIn(): Promise<void> {
  const puter = await loadPuter();
  if (puter.auth.isSignedIn()) return;
  try {
    await puter.auth.signIn();
  } catch (e) {
    const msg = describe(e);
    if (/popup/i.test(msg))
      throw new Error("Your browser blocked the Puter sign-in popup. Allow popups for this site and try again.");
    throw new Error("Sign-in to Puter was cancelled.");
  }
}

function describe(e: unknown): string {
  if (!e) return "";
  if (typeof e === "string") return e;
  if (e instanceof Error) return e.message;
  const o = e as { message?: string; error?: { message?: string; code?: string } | string; code?: string };
  if (typeof o.error === "string") return o.error;
  return [o.error?.code, o.error?.message, o.code, o.message].filter(Boolean).join(": ") || JSON.stringify(e);
}

function friendly(raw: string): string {
  if (/insufficient|funds|credit|balance|quota|limit|usage/i.test(raw))
    return "Your Puter account has used up its free AI allowance. Add credit at puter.com or try again later.";
  if (/safety|blocked|prohibited|policy|moderation/i.test(raw))
    return "This photo was declined by the safety filter. Please try a different image.";
  if (/sign|auth|401|unauthori/i.test(raw)) return "Please sign in to Puter to continue.";
  return `The try-on didn't complete${raw ? ` (${raw.slice(0, 160)})` : ""}. Please try again.`;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("Could not read image."));
    r.readAsDataURL(blob);
  });
}

/** Copy the (temporary) hosted result into a local object URL so it can be downloaded and survives expiry. */
async function persist(src: string): Promise<string> {
  if (src.startsWith("data:") || src.startsWith("blob:")) return src;
  try {
    const res = await fetch(src);
    if (!res.ok) return src;
    return URL.createObjectURL(await res.blob());
  } catch {
    return src;
  }
}

export async function puterTryOn(opts: {
  person: Blob;
  garment: Blob;
  type: GarmentType;
  notes: string;
  aspect: number;
  testMode?: boolean;
}): Promise<{ image: string; model: string }> {
  const puter = await loadPuter();
  const [person, garment] = await Promise.all([blobToDataUrl(opts.person), blobToDataUrl(opts.garment)]);
  const prompt = buildPrompt(opts.type, opts.notes);

  let lastRaw = "";
  for (const model of MODELS) {
    try {
      const img = await puter.ai.txt2img(prompt, {
        model,
        input_images: [person, garment],
        aspect_ratio: nearestRatio(opts.aspect),
        test_mode: !!opts.testMode,
      });
      if (!img?.src) throw new Error("No image returned.");
      return { image: await persist(img.src), model };
    } catch (e) {
      lastRaw = describe(e);
      console.error(`Puter try-on with ${model} failed:`, e);
      // Only move on to the next model if this one isn't available
      if (!/model|not found|unsupported|unknown|unavailable|404/i.test(lastRaw)) break;
    }
  }
  throw new Error(friendly(lastRaw));
}
