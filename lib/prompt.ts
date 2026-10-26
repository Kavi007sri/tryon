/** Shared by the server route and the in-browser (Puter) path. */
export type GarmentType = "top" | "bottom" | "dress" | "outerwear" | "full";

export const SUPPORTED_RATIOS = ["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9"];

const GARMENT_INSTRUCTIONS: Record<GarmentType, string> = {
  top: "The garment is a TOP (shirt, t-shirt, blouse, polo, sweater). Replace only the person's upper-body clothing. Keep their existing bottoms, shoes and accessories unchanged.",
  bottom:
    "The garment is a BOTTOM (trousers, jeans, skirt, shorts). Replace only the person's lower-body clothing. Keep their existing top, shoes and accessories unchanged.",
  dress:
    "The garment is a DRESS or GOWN. Replace the person's top and bottom with this one-piece garment, respecting its true length, silhouette and neckline. Keep shoes and accessories unless the dress covers them.",
  outerwear:
    "The garment is OUTERWEAR (jacket, coat, blazer). Layer it naturally over the person's current outfit, keeping the clothing underneath visible where it would be.",
  full: "The garment image shows a FULL OUTFIT. Dress the person in the complete outfit shown.",
};

export function nearestRatio(ratio: number): string {
  let best = "3:4";
  let bestDiff = Infinity;
  for (const r of SUPPORTED_RATIOS) {
    const [w, h] = r.split(":").map(Number);
    const diff = Math.abs(Math.log(w / h) - Math.log(ratio));
    if (diff < bestDiff) {
      best = r;
      bestDiff = diff;
    }
  }
  return best;
}

export function buildPrompt(type: GarmentType, notes: string): string {
  return [
    "You are a professional fashion photo retoucher performing a virtual try-on.",
    "IMAGE 1 is the PERSON. IMAGE 2 is the GARMENT (a product photo, flat lay, or a garment worn by someone else).",
    GARMENT_INSTRUCTIONS[type],
    "Requirements:",
    "- Preserve the person's identity exactly: face, facial features, expression, hair, skin tone, body shape, pose, hands and proportions.",
    "- Preserve the original background, camera angle, framing and lighting.",
    "- Reproduce the garment faithfully: exact color, fabric, texture, pattern, prints, logos, buttons, collar, and length.",
    "- Fit the garment realistically to the body with natural folds, drape, shadows and occlusion (hair or arms in front of the garment stay in front).",
    "- If IMAGE 2 shows the garment on another person, use only the garment, never that person's face or body.",
    notes ? `- Styling note from the user: ${notes}` : "",
    "Output a single photorealistic image of the person from IMAGE 1 wearing the garment from IMAGE 2. Do not add text, borders or watermarks.",
    "Respond with the image only. Do not write any text reply.",
  ]
    .filter(Boolean)
    .join("\n");
}
