import Link from "next/link";

import FamiliesGrid from "./FamiliesGrid";
import { getImagesWithBlur, type ImageSource } from "../../../lib/getImagesWithBlur";

export const metadata = {
  title: "Families — Blackburn Studio",
};

// Sequence preserved exactly — curated for emotional pacing and editorial rhythm.
const familySources: ImageSource[] = [
  { id: 1, file: "families-beach-connection.jpg", alt: "Family relaxing together on rocks near the beach" },
  { id: 2, file: "families-mother-daughter-embrace.jpg", alt: "Mother and daughter embracing outdoors" },
  { id: 3, file: "families-father-child-moment.jpg", alt: "Father holding young child in a quiet candid moment" },
  { id: 4, file: "families-formal-family-portrait.jpg", alt: "Formal family portrait outdoors" },
  { id: 5, file: "families-waterfall-family-portrait.jpg", alt: "Family portrait near a waterfall" },
  { id: 6, file: "families-blossom-family.jpg", alt: "Family seated together beneath blossom trees" },
  { id: 7, file: "families-blue-family-storytelling.jpg", alt: "Family interacting together outdoors in natural light" },
  { id: 8, file: "families-generational-family.jpg", alt: "Multi-generational family portrait outdoors" },
  { id: 9, file: "families-red-jumper-connection.jpg", alt: "Father and child portrait with red jumper" },
  { id: 10, file: "families-waterfall-father-sons.jpg", alt: "Father standing with two sons near a waterfall" },
  { id: 11, file: "families-seated-under-trees.jpg", alt: "Family seated together beneath trees" },
  { id: 12, file: "families-playful-family-stack.jpg", alt: "Playful stacked family portrait outdoors" },
];

export default async function FamiliesPage() {
  const images = await getImagesWithBlur("families", familySources);
  return (
    <div className="flex min-h-screen flex-col bg-black text-neutral-300">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6 md:px-8">
        <Link
          href="/"
          className="text-xs font-medium uppercase tracking-[0.3em] text-neutral-300 transition-colors hover:text-white"
        >
          Blackburn Studio
        </Link>
        <nav className="hidden gap-8 text-sm text-neutral-400 md:flex">
          <Link href="/work" className="transition-colors hover:text-white">
            Work
          </Link>
          <Link href="/#about" className="transition-colors hover:text-white">
            About
          </Link>
          <Link href="/#contact" className="transition-colors hover:text-white">
            Contact
          </Link>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 pt-12 pb-24 md:px-8 md:pt-20 md:pb-32">
        <section>
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between md:gap-12">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.3em] text-neutral-500">
                Work
              </p>
              <h1 className="mt-3 text-4xl font-medium leading-[1.05] tracking-tight text-white md:text-6xl">
                Families
              </h1>
            </div>
            <p className="max-w-md text-sm leading-relaxed text-neutral-400 md:text-base">
              Relaxed family photography focused on connection, warmth,
              expression and real moments.
            </p>
          </div>

          <div className="mt-12 md:mt-16">
            <FamiliesGrid images={images} />
          </div>
        </section>

        <div className="mt-20 flex justify-center">
          <Link
            href="/work"
            className="inline-flex items-center justify-center rounded-full border border-white/20 px-5 py-2 text-sm font-medium text-white/80 transition hover:border-white/40 hover:text-white"
          >
            ← Back to work
          </Link>
        </div>
      </main>

      <footer className="mx-auto w-full max-w-6xl px-6 py-10 md:px-8">
        <div className="flex flex-col items-center justify-between gap-4 text-xs text-neutral-500 md:flex-row">
          <span className="uppercase tracking-[0.3em]">Blackburn Studio</span>
          <span>
            &copy; {new Date().getFullYear()} Blackburn Studio. All rights
            reserved.
          </span>
        </div>
      </footer>
    </div>
  );
}
