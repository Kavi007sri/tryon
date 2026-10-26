"use client";

import { motion, useScroll, useTransform } from "framer-motion";

export default function Nav() {
  const { scrollY } = useScroll();
  const bg = useTransform(scrollY, [0, 120], ["rgba(247,242,234,0)", "rgba(247,242,234,0.82)"]);
  const border = useTransform(scrollY, [0, 120], ["rgba(226,214,195,0)", "rgba(226,214,195,0.9)"]);

  return (
    <motion.header
      style={{ backgroundColor: bg, borderColor: border }}
      className="fixed inset-x-0 top-0 z-50 border-b backdrop-blur-md"
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-8">
        <a href="#top" className="font-display text-2xl tracking-wide">
          Maison <span className="italic text-gold-deep">Atelier</span>
        </a>
        <div className="flex items-center gap-6 text-[0.7rem] font-semibold tracking-[0.28em] uppercase">
          <a href="#how" className="hidden text-ink-soft transition-colors hover:text-gold-deep sm:inline">
            The Ritual
          </a>
          <a
            href="#studio"
            className="rounded-full border border-ink px-4 py-2 transition-colors duration-500 hover:bg-ink hover:text-ivory"
          >
            Try On
          </a>
        </div>
      </nav>
    </motion.header>
  );
}
