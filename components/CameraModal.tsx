"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { captureFrame, type PreparedImage } from "@/lib/image";

type Props = {
  open: boolean;
  title: string;
  /** Show a body silhouette guide (for the person photo) */
  guide?: boolean;
  onClose: () => void;
  onCapture: (img: PreparedImage) => void;
};

const TIMERS = [0, 3, 10];

function cameraErrorMessage(e: unknown): string {
  const name = e instanceof DOMException ? e.name : "";
  if (name === "NotAllowedError") return "Camera access was blocked. Allow it in your browser's address bar, then try again.";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "No camera was found on this device.";
  if (name === "NotReadableError") return "Your camera is being used by another app. Close it and try again.";
  return "Could not start the camera.";
}

export default function CameraModal({ open, title, guide, onClose, onCapture }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [timer, setTimer] = useState(3);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [flash, setFlash] = useState(false);
  const [shot, setShot] = useState<PreparedImage | null>(null);
  const [hasMultiple, setHasMultiple] = useState(false);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setReady(false);
  }, []);

  // Start / restart the stream when opened or the lens changes
  useEffect(() => {
    if (!open || shot) return;
    let cancelled = false;
    setError(null);
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Camera needs a secure connection (https or localhost) and a modern browser.");
        return;
      }
      try {
        stop();
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        const devices = await navigator.mediaDevices.enumerateDevices();
        setHasMultiple(devices.filter((d) => d.kind === "videoinput").length > 1);
      } catch (e) {
        if (!cancelled) setError(cameraErrorMessage(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, facing, shot, stop]);

  // Fully release the camera when closing
  useEffect(() => {
    if (!open) {
      stop();
      setShot(null);
      setCountdown(null);
    }
  }, [open, stop]);
  useEffect(() => stop, [stop]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const takePhoto = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    setFlash(true);
    setTimeout(() => setFlash(false), 350);
    const img = await captureFrame(video, facing === "user");
    stop();
    setShot(img);
  }, [facing, stop]);

  // Countdown ticker
  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      setCountdown(null);
      takePhoto();
      return;
    }
    const t = setTimeout(() => setCountdown((c) => (c === null ? null : c - 1)), 1000);
    return () => clearTimeout(t);
  }, [countdown, takePhoto]);

  const onShutter = () => {
    if (countdown !== null) {
      setCountdown(null);
      return;
    }
    if (timer === 0) takePhoto();
    else setCountdown(timer);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/80 p-3 backdrop-blur-sm sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="relative flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-[2rem] bg-ink text-ivory shadow-2xl"
            initial={{ y: 40, scale: 0.96, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 30, scale: 0.97, opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4">
              <p className="font-display text-2xl">{title}</p>
              <button
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 transition hover:bg-white/10"
                aria-label="Close camera"
              >
                ✕
              </button>
            </div>

            <div className="relative mx-3 aspect-[3/4] max-h-[68vh] overflow-hidden rounded-[1.5rem] bg-black sm:aspect-[4/3]">
              {shot ? (
                // eslint-disable-next-line @next/next/no-img-element
                <motion.img
                  src={shot.url}
                  alt="Captured"
                  className="h-full w-full object-contain"
                  initial={{ scale: 1.04, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.6 }}
                />
              ) : (
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  onLoadedData={() => setReady(true)}
                  className={`h-full w-full object-cover transition-opacity duration-700 ${ready ? "opacity-100" : "opacity-0"} ${facing === "user" ? "-scale-x-100" : ""}`}
                />
              )}

              {!shot && !ready && !error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-ivory/70">
                  <span className="h-10 w-10 animate-spin rounded-full border-2 border-gold-soft border-t-transparent" />
                  <p className="text-xs tracking-[0.3em] uppercase">Waking the camera</p>
                </div>
              )}

              {error && (
                <div className="absolute inset-0 flex items-center justify-center p-8 text-center">
                  <p className="max-w-sm text-ivory/80">{error}</p>
                </div>
              )}

              {guide && !shot && ready && (
                <svg
                  className="pointer-events-none absolute inset-0 h-full w-full opacity-40"
                  viewBox="0 0 300 400"
                  preserveAspectRatio="xMidYMid meet"
                >
                  <path
                    d="M150 40c22 0 38 17 38 40s-16 42-38 42-38-19-38-42 16-40 38-40zM90 140c18-10 38-14 60-14s42 4 60 14c14 8 22 22 24 38l10 110M90 140c-14 8-22 22-24 38L56 288M110 150v240M190 150v240"
                    fill="none"
                    stroke="#d9c39c"
                    strokeWidth="1.5"
                    strokeDasharray="5 6"
                  />
                </svg>
              )}

              <AnimatePresence>
                {countdown !== null && countdown > 0 && (
                  <motion.div
                    key={countdown}
                    className="absolute inset-0 flex items-center justify-center font-display text-[9rem] font-light text-ivory drop-shadow-lg"
                    initial={{ scale: 1.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.6, opacity: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    {countdown}
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {flash && (
                  <motion.div
                    className="absolute inset-0 bg-white"
                    initial={{ opacity: 0.9 }}
                    animate={{ opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.35 }}
                  />
                )}
              </AnimatePresence>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
              {shot ? (
                <>
                  <button
                    onClick={() => setShot(null)}
                    className="rounded-full border border-white/25 px-6 py-3 text-[0.7rem] font-semibold tracking-[0.28em] uppercase transition hover:bg-white/10"
                  >
                    Retake
                  </button>
                  <button
                    onClick={() => {
                      onCapture(shot);
                      onClose();
                    }}
                    className="rounded-full bg-gold px-8 py-3 text-[0.7rem] font-semibold tracking-[0.28em] text-ink uppercase transition hover:bg-gold-soft"
                  >
                    Use this photo
                  </button>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-1 rounded-full border border-white/15 p-1 text-[0.65rem] font-semibold tracking-[0.2em] uppercase">
                    {TIMERS.map((t) => (
                      <button
                        key={t}
                        onClick={() => setTimer(t)}
                        className={`rounded-full px-3 py-2 transition ${timer === t ? "bg-ivory text-ink" : "text-ivory/60 hover:text-ivory"}`}
                      >
                        {t === 0 ? "Now" : `${t}s`}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={onShutter}
                    disabled={!ready}
                    aria-label={countdown !== null ? "Cancel timer" : "Take photo"}
                    className="group relative flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full border-2 border-ivory/80 transition disabled:opacity-40"
                  >
                    <span
                      className={`block rounded-full transition-all duration-300 ${countdown !== null ? "h-7 w-7 rounded-md bg-rose" : "h-14 w-14 bg-ivory group-hover:scale-90 group-active:scale-75"}`}
                    />
                  </button>

                  <button
                    onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}
                    disabled={!hasMultiple}
                    className="rounded-full border border-white/15 px-4 py-2.5 text-[0.65rem] font-semibold tracking-[0.2em] uppercase transition hover:bg-white/10 disabled:opacity-30"
                  >
                    ⟲ Flip
                  </button>
                </>
              )}
            </div>
            {!shot && (
              <p className="px-6 pb-5 text-center text-xs text-ivory/50">
                {guide
                  ? "Stand back so your whole outfit is in frame, facing the camera in even light. Use the timer to step into place."
                  : "Lay the garment flat or hold it up against a plain background."}
              </p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
