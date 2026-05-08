import Image from "next/image";
import Link from "next/link";

import { getImagesWithBlur, type ImageSource } from "@/lib/getImagesWithBlur";

const baseUrl = process.env.NEXT_PUBLIC_IMAGE_BASE_URL || "/images";

const portraits = ["portrait-01.jpg", "portrait-02.jpg", "portrait-03.jpg"];

// Japan homepage trio — composed for cinematic asymmetry.
// Dominant first, then two quieter supports. Aspect ratios are read from the
// source files so nothing is cropped against its will.
const japanSources: ImageSource[] = [
  { id: 1, file: "garden-reflection.jpg", alt: "Still water reflecting a Japanese garden" },
  { id: 2, file: "bridge-reflection.jpg", alt: "A bridge mirrored in calm water" },
  { id: 3, file: "red-doorway.jpg", alt: "A weathered red doorway, Japan" },
];

const closingStripSource: ImageSource[] = [
  { id: 99, file: "black-texture.jpg", alt: "" },
];

export default async function Home() {
  const japanImages = await getImagesWithBlur("japan", japanSources);
  const [closingImage] = await getImagesWithBlur("japan", closingStripSource);
  const [japanLead, ...japanSupports] = japanImages;
  return (
    <div className="bg-black text-neutral-300">
      {/* Hero */}
      <section className="relative h-[85vh] w-full overflow-hidden">
        <img
          src={`${baseUrl}/hero.jpg`}
          alt="Blackburn Studio hero"
          className="absolute inset-0 h-full w-full object-cover object-[70%_center] md:object-center"
        />
        <div className="absolute inset-0 z-10 bg-gradient-to-b from-black/70 via-black/40 to-black/80 md:from-black/60 md:via-black/30 md:to-black/70" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-24 bg-gradient-to-t from-black via-black/40 to-transparent md:h-32" />

        <header className="relative z-30 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6 md:px-8">
          <span className="text-xs font-medium uppercase tracking-[0.3em] text-neutral-300">
            Blackburn Studio
          </span>
          <nav className="hidden gap-8 text-sm text-neutral-400 md:flex">
            <a href="/work" className="transition-colors hover:text-white">Work</a>
            <a href="#about" className="transition-colors hover:text-white">About</a>
            <a href="#contact" className="transition-colors hover:text-white">Contact</a>
          </nav>
        </header>

        <div className="relative z-30 mx-auto flex h-[calc(85vh-72px)] w-full max-w-6xl flex-col justify-end px-6 pb-16 md:px-8 md:pb-20">
          <h1 className="rise-in mt-24 max-w-[90%] text-4xl font-medium leading-[1.1] tracking-tight text-white sm:text-5xl md:mt-0 md:max-w-xl md:text-6xl">
            Honest, cinematic photography
            <br />
            <span className="text-neutral-400">with a human edge.</span>
          </h1>
          <p
            className="rise-in mt-6 max-w-xl text-sm leading-relaxed text-neutral-400 md:text-base"
            style={{ animationDelay: "120ms" }}
          >
            Blackburn Studio focuses on portrait photography with a natural,
            human approach — supported by a curated collection of landscape
            work from Japan.
          </p>
          <div
            className="rise-in mt-8 flex w-full flex-col gap-3 md:mt-10 md:w-auto md:flex-row md:gap-4"
            style={{ animationDelay: "240ms" }}
          >
            <a
              href="#work"
              className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-white px-5 py-2 text-sm font-medium text-black transition hover:bg-neutral-200 md:w-auto"
            >
              View work
            </a>
            <a
              href="#contact"
              className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-white/20 px-5 py-2 text-sm font-medium text-white/80 transition hover:border-white/40 hover:text-white md:w-auto"
            >
              Enquire
            </a>
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-6 left-1/2 hidden h-6 w-px -translate-x-1/2 bg-white/25 md:block" />
      </section>

      {/* Work */}
      <section id="work">
        {/* Portraits — tighter top spacing creates a connected exhale from the hero */}
        <div className="mx-auto max-w-6xl px-6 pt-10 pb-20 md:px-8 md:pt-16 md:pb-28">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:gap-12">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.3em] text-neutral-500">
                Primary
              </p>
              <h2 className="mt-3 text-3xl font-medium tracking-tight text-white md:text-4xl">
                Portraits
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-neutral-400 md:ml-auto md:text-base">
              Quiet, considered portraiture. Natural light, real expression,
              and a sense of presence in every frame.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-5">
            {portraits.map((file) => (
              <Link
                key={file}
                href="/work"
                aria-label="View selected work"
                className="group relative block aspect-4/5 overflow-hidden rounded-2xl bg-neutral-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/60"
              >
                <Image
                  src={`${baseUrl}/${file}`}
                  alt="Portrait by Blackburn Studio"
                  fill
                  sizes="(min-width: 768px) 33vw, 100vw"
                  className="object-cover transition duration-700 ease-out group-hover:-translate-y-0.5 group-hover:scale-[1.01]"
                />
              </Link>
            ))}
          </div>
        </div>

      </section>

      {/* About — placed between Portraits and Japan to bridge
          human connection → artistic philosophy → contemplative observation. */}
      <section
        id="about"
        className="mx-auto max-w-6xl px-6 pt-16 pb-20 md:px-8 md:pt-24 md:pb-28"
      >
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-neutral-500">
            About
          </p>
          <h2 className="mt-4 text-3xl font-medium leading-tight tracking-tight text-white md:text-4xl">
            Clean, natural, human-focused photography.
          </h2>
          <p className="mt-8 text-sm leading-loose text-neutral-400 md:text-base">
            Blackburn Studio is built around a simple idea: photographs should
            feel honest. We work quietly and slowly, prioritising real moments
            over performance, and natural light over spectacle. The result is
            imagery that holds up — calm, considered, and unmistakably human.
          </p>
        </div>
      </section>

      {/* Japan — contemplative extension of the studio's worldview.
          Asymmetric editorial weighting, but each frame keeps its native
          aspect ratio so the photography is never cropped against itself. */}
      <section className="mx-auto max-w-6xl px-6 pt-16 pb-20 md:px-8 md:pt-24 md:pb-28">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:gap-12">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-neutral-500">
              Series
            </p>
            <h2 className="mt-3 text-3xl font-medium tracking-tight text-white md:text-4xl">
              Japan
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-neutral-400 md:ml-auto md:text-base">
            A curated landscape series — stillness, scale, and the soft
            geometry of a country observed slowly.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-12 md:items-start md:gap-6">
          <Link
            href="/work/japan"
            aria-label="View Japan series"
            className="group relative block overflow-hidden rounded-2xl bg-neutral-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/60 md:col-span-7"
            style={
              japanLead.width && japanLead.height
                ? { aspectRatio: `${japanLead.width} / ${japanLead.height}` }
                : undefined
            }
          >
            <Image
              src={japanLead.src}
              alt={japanLead.alt}
              fill
              placeholder="blur"
              blurDataURL={japanLead.blurDataURL}
              sizes="(min-width: 768px) 58vw, 100vw"
              className="object-cover transition duration-700 ease-out group-hover:-translate-y-0.5 group-hover:scale-[1.01]"
            />
          </Link>
          <div className="flex flex-col gap-8 md:col-span-5 md:gap-6">
            {japanSupports.map((img) => (
              <Link
                key={img.id}
                href="/work/japan"
                aria-label="View Japan series"
                className="group relative block overflow-hidden rounded-2xl bg-neutral-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/60"
                style={
                  img.width && img.height
                    ? { aspectRatio: `${img.width} / ${img.height}` }
                    : undefined
                }
              >
                <Image
                  src={img.src}
                  alt={img.alt}
                  fill
                  placeholder="blur"
                  blurDataURL={img.blurDataURL}
                  sizes="(min-width: 768px) 42vw, 100vw"
                  className="object-cover transition duration-700 ease-out group-hover:-translate-y-0.5 group-hover:scale-[1.01]"
                />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section
        id="contact"
        className="mx-auto max-w-6xl px-6 pt-24 pb-28 md:px-8"
      >
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-neutral-500">
            Contact
          </p>
          <h2 className="mt-4 text-3xl font-medium leading-tight tracking-tight text-white md:text-5xl">
            Let&rsquo;s work together.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-sm leading-relaxed text-neutral-400 md:text-base">
            Commissions, collaborations, and considered conversations all
            welcome.
          </p>
          <a
            href="mailto:hello@theblackburn.studio"
            className="mt-10 inline-flex items-center justify-center rounded-full border border-white/20 px-5 py-2 text-sm font-medium text-neutral-200 transition duration-500 ease-out hover:scale-[1.02] hover:border-white/40 hover:text-white"
          >
            hello@theblackburn.studio
          </a>
        </div>
      </section>

      {/* Closing exhale — abstract atmospheric texture, not a recognisable photo.
          Letterbox crop, low opacity, fade to black at both edges. Felt, not noticed. */}
      <div className="relative mt-20 h-32 w-full overflow-hidden md:mt-28 md:h-44">
        <Image
          src={closingImage.src}
          alt=""
          aria-hidden="true"
          fill
          placeholder="blur"
          blurDataURL={closingImage.blurDataURL}
          sizes="100vw"
          className="scale-105 object-cover object-center opacity-40"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black via-transparent to-black" />
        <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-black to-transparent md:w-40" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-black to-transparent md:w-40" />
      </div>

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
