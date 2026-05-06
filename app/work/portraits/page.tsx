import Link from "next/link";
import PortraitsGrid from "./PortraitsGrid";
import { getImagesWithBlur } from "../../../lib/getImagesWithBlur";

export const metadata = {
  title: "Portraits — Blackburn Studio",
};

export default async function PortraitsPage() {
  const images = await getImagesWithBlur();
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
                Primary
              </p>
              <h1 className="mt-3 text-4xl font-medium leading-[1.05] tracking-tight text-white md:text-6xl">
                Portraits
              </h1>
            </div>
            <p className="max-w-md text-sm leading-relaxed text-neutral-400 md:text-base">
              Quiet, considered portraiture. Natural light, real expression,
              and a sense of presence in every frame.
            </p>
          </div>

          <div className="mt-12 md:mt-16">
            <PortraitsGrid images={images} />
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
