export type PreparedImage = {
  /** Object URL / data URL for previews */
  url: string;
  blob: Blob;
  width: number;
  height: number;
};

const MAX_SIDE = 1536;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read this image."));
    img.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not encode image."))), "image/jpeg", 0.92),
  );
}

/** Downscale and re-encode any image source to a JPEG (fixes EXIF rotation, HEIC-free, small upload). */
export async function prepareImage(source: string | Blob): Promise<PreparedImage> {
  const src = typeof source === "string" ? source : URL.createObjectURL(source);
  try {
    const img = await loadImage(src);
    const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.round(img.naturalWidth * scale);
    const height = Math.round(img.naturalHeight * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fff"; // flatten transparent PNGs onto white
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    const blob = await canvasToBlob(canvas);
    return { url: URL.createObjectURL(blob), blob, width, height };
  } finally {
    if (typeof source !== "string") URL.revokeObjectURL(src);
  }
}

/** Capture the current video frame (optionally mirrored, to match a selfie preview). */
export async function captureFrame(video: HTMLVideoElement, mirror: boolean): Promise<PreparedImage> {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d")!;
  if (mirror) {
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return prepareImage(await canvasToBlob(canvas));
}
