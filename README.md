# Maison Atelier — Virtual Try-On

A Next.js virtual try-on website. Upload a photo (or take one with the camera), pick a garment, and Gemini's image model dresses you in it.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## How the AI runs

By default, try-ons run in the browser through [Puter.js](https://docs.puter.com), so no API key is needed. Each visitor signs in with a free Puter account and uses their own monthly allowance.

To use your own Gemini API key or Google Vertex AI instead, copy `.env.example` to `.env.local`, fill it in, and set:

```
NEXT_PUBLIC_TRYON_PROVIDER=server
```

## Changing the sample images

- Files: `public/samples/`
- Fitting-room samples: `PERSON_SAMPLES` and `GARMENT_SAMPLES` in `components/Studio.tsx`
- Hero images: `components/Hero.tsx`
