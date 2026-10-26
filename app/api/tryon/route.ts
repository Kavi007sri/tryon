import { NextResponse } from "next/server";
import { generateTryOn, TryOnError, type GarmentType } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
const TYPES: GarmentType[] = ["top", "bottom", "dress", "outerwear", "full"];

async function readImage(form: FormData, field: string) {
  const file = form.get(field);
  if (!(file instanceof File) || file.size === 0) {
    throw new TryOnError(`Missing ${field} image.`, 400);
  }
  if (!ALLOWED.includes(file.type)) throw new TryOnError(`The ${field} image must be JPEG, PNG or WebP.`, 400);
  if (file.size > MAX_BYTES) throw new TryOnError(`The ${field} image is too large (max 8 MB).`, 413);
  return { data: Buffer.from(await file.arrayBuffer()).toString("base64"), mimeType: file.type };
}

export async function POST(req: Request) {
  try {
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      throw new TryOnError("Expected multipart form data.", 400);
    }
    const type = String(form.get("type") ?? "top") as GarmentType;
    if (!TYPES.includes(type)) throw new TryOnError("Unknown garment type.", 400);
    const notes = String(form.get("notes") ?? "").slice(0, 300);
    const aspect = Number(form.get("aspect")) || 0.75;

    const [person, garment] = await Promise.all([readImage(form, "person"), readImage(form, "garment")]);
    const result = await generateTryOn({ person, garment, type, notes, aspect });

    return NextResponse.json({ image: `data:${result.mimeType};base64,${result.data}`, model: result.model });
  } catch (e) {
    if (e instanceof TryOnError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
