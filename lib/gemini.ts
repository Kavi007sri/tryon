import "server-only";
import fs from "node:fs";
import path from "node:path";
import { ApiError, GoogleGenAI, Modality, type GenerateContentResponse } from "@google/genai";
import { buildPrompt, nearestRatio, type GarmentType } from "./prompt";

export type { GarmentType };

const DEFAULT_MODELS = ["gemini-nano-banana-2.1", "gemini-3-pro-image", "gemini-2.5-flash-image"];

export class TryOnError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

function extractImage(res: GenerateContentResponse): { data: string; mimeType: string } {
  const blocked = res.promptFeedback?.blockReason;
  if (blocked) {
    throw new TryOnError("This photo was declined by the safety filter. Please try a different image.", 422);
  }
  const candidate = res.candidates?.[0];
  for (const part of candidate?.content?.parts ?? []) {
    if (part.inlineData?.data) {
      return { data: part.inlineData.data, mimeType: part.inlineData.mimeType || "image/png" };
    }
  }
  const reason = candidate?.finishReason ?? "";
  if (/SAFETY|PROHIBITED|BLOCK|RECITATION/i.test(String(reason))) {
    throw new TryOnError("The result was declined by the safety filter. Please try a different photo or garment.", 422);
  }
  throw new TryOnError("The model did not return an image. Please try again.", 502);
}

/** Vertex AI when GOOGLE_CLOUD_PROJECT is set (service-account key file), otherwise the Gemini Developer API. */
function createClient(): GoogleGenAI {
  const project = process.env.GOOGLE_CLOUD_PROJECT;
  if (project) {
    const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS
      ? path.resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.GOOGLE_APPLICATION_CREDENTIALS)
      : undefined;
    if (keyFile && !fs.existsSync(keyFile)) {
      throw new TryOnError(`Service-account key file not found: ${keyFile}`, 500);
    }
    return new GoogleGenAI({
      vertexai: true,
      project,
      location: process.env.GOOGLE_CLOUD_LOCATION || "global",
      googleAuthOptions: keyFile ? { keyFile, scopes: ["https://www.googleapis.com/auth/cloud-platform"] } : undefined,
    });
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new TryOnError(
      "Server is not configured. Set GOOGLE_CLOUD_PROJECT (Vertex AI) or GEMINI_API_KEY in .env.local.",
      500,
    );
  }
  return new GoogleGenAI({ apiKey });
}

export async function generateTryOn(opts: {
  person: { data: string; mimeType: string };
  garment: { data: string; mimeType: string };
  type: GarmentType;
  notes: string;
  aspect: number;
}): Promise<{ data: string; mimeType: string; model: string }> {
  const ai = createClient();
  const models = process.env.GEMINI_MODEL
    ? [process.env.GEMINI_MODEL, ...DEFAULT_MODELS.filter((m) => m !== process.env.GEMINI_MODEL)]
    : DEFAULT_MODELS;

  let lastError: unknown;
  for (const model of models) {
    try {
      const res = await ai.models.generateContent({
        model,
        contents: [
          {
            role: "user",
            parts: [
              { text: "IMAGE 1 (person):" },
              { inlineData: opts.person },
              { text: "IMAGE 2 (garment):" },
              { inlineData: opts.garment },
              { text: buildPrompt(opts.type, opts.notes) },
            ],
          },
        ],
        config: {
          responseModalities: [Modality.IMAGE, Modality.TEXT],
          imageConfig: { aspectRatio: nearestRatio(opts.aspect) },
        },
      });
      return { ...extractImage(res), model };
    } catch (e) {
      if (e instanceof TryOnError) throw e;
      lastError = e;
      // Only fall through to the next model if this one doesn't exist for this key
      if (e instanceof ApiError && e.status === 404) continue;
      break;
    }
  }

  if (lastError instanceof ApiError) {
    console.error("Gemini API error:", lastError.status, lastError.message);
    if (lastError.status === 402 || /prepayment credits/i.test(lastError.message))
      throw new TryOnError(
        "The Gemini API key's prepaid credits are used up. Top up credits at ai.studio/projects, then try again.",
        402,
      );
    if (lastError.status === 429 && /free_tier|limit: 0/i.test(lastError.message))
      throw new TryOnError(
        "Gemini image generation isn't available on this API key's free tier. Enable billing for the key's project at aistudio.google.com, then try again.",
        402,
      );
    if (lastError.status === 429)
      throw new TryOnError("Too many requests right now. Please wait a moment and try again.", 429);
    if (lastError.status === 400 && /api key/i.test(lastError.message))
      throw new TryOnError("The Gemini API key is invalid.", 500);
    if (lastError.status === 403 && /SERVICE_DISABLED|has not been used|is disabled/i.test(lastError.message))
      throw new TryOnError(
        "The Vertex AI API is not enabled for this Google Cloud project. Enable it in the Cloud console, wait a minute, then try again.",
        500,
      );
    if (lastError.status === 403 && /billing/i.test(lastError.message))
      throw new TryOnError(
        "Billing is not enabled for this Google Cloud project. Link the free-trial billing account to it, then try again.",
        402,
      );
    if (lastError.status === 403 && process.env.GOOGLE_CLOUD_PROJECT)
      throw new TryOnError(
        'The service account doesn\'t have permission. Give it the "Vertex AI User" role in IAM.',
        500,
      );
    if (lastError.status === 403) throw new TryOnError("The Gemini API key doesn't have access to this model.", 500);
    if (lastError.status === 404)
      throw new TryOnError(
        "No supported Gemini image model is available for this key. Set GEMINI_MODEL in .env.local.",
        500,
      );
    throw new TryOnError("The try-on service had a problem. Please try again.", 502);
  }
  console.error("Try-on failed:", lastError);
  if (
    /invalid_grant|invalid_client|private key|DECODER routines|asn1|Unexpected token|Could not load the default credentials|Unable to detect a Project Id/i.test(
      String(lastError),
    )
  )
    throw new TryOnError(
      "Google Cloud credentials are invalid. Check the service-account key file and GOOGLE_CLOUD_PROJECT.",
      500,
    );
  throw new TryOnError("The try-on service had a problem. Please try again.", 502);
}
