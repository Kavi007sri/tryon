import Hero from "@/components/Hero";
import HowItWorks from "@/components/HowItWorks";
import Nav from "@/components/Nav";
import Studio from "@/components/Studio";

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <HowItWorks />
        <Studio />
      </main>
      <footer className="border-t border-sand/70 px-4 py-10 text-center text-xs tracking-[0.25em] text-muted uppercase sm:px-8">
        Maison Atelier · Virtual try-on powered by Gemini via Puter.js
      </footer>
    </>
  );
}
