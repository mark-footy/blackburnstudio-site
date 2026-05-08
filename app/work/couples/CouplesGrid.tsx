"use client";

import { useCallback, useState } from "react";

import {
  GalleryImageCard,
  Lightbox,
  MORPH_DURATION,
  type GalleryImage,
  type MorphOrigin,
  type MorphPhase,
} from "@/components/gallery";

export default function CouplesGrid({ images }: { images: GalleryImage[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [closing, setClosing] = useState(false);
  const [origin, setOrigin] = useState<MorphOrigin | null>(null);
  const [morphPhase, setMorphPhase] = useState<MorphPhase>("open");

  const open = useCallback((i: number, o: MorphOrigin) => {
    setClosing(false);
    setOrigin(o);
    setMorphPhase("opening");
    setOpenIndex(i);
    window.setTimeout(() => setMorphPhase("open"), MORPH_DURATION);
  }, []);

  const close = useCallback(() => {
    setMorphPhase("closing");
    setClosing(true);
    window.setTimeout(() => {
      setOpenIndex(null);
      setClosing(false);
      setOrigin(null);
      setMorphPhase("open");
    }, MORPH_DURATION);
  }, []);

  // Curated editorial rhythm — sequence preserved exactly.
  // 1 L  — quiet curiosity, full-width opener
  // 2 P  — intimate observational pause, narrowed centred portrait
  // 3 L  — quiet presence, medium-width centred landscape (breathes alone)
  // 4 L  — emotional warmth / romantic punctuation, full-width
  // 5 L  — grounded mature ending, narrowed and centred
  return (
    <>
      <div className="flex flex-col gap-8 md:gap-12">
        {/* 1 — cinematic opener */}
        <GalleryImageCard
          image={images[0]}
          onOpen={(o) => open(0, o)}
          intrinsicAspect
        />

        {/* 2 — intimate observational pause, centred portrait with more presence */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-12 md:gap-8">
          <div className="md:col-span-8 md:col-start-3">
            <GalleryImageCard
              image={images[1]}
              onOpen={(o) => open(1, o)}
              intrinsicAspect
            />
          </div>
        </div>

        {/* 3 — quiet presence, slightly narrower centred landscape so it reads
            as a quieter supporting portrait, not competing with the dog image */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-12 md:gap-8">
          <div className="md:col-span-7 md:col-start-4">
            <GalleryImageCard
              image={images[2]}
              onOpen={(o) => open(2, o)}
              intrinsicAspect
            />
          </div>
        </div>

        {/* 4 — emotional punctuation, full-width */}
        <GalleryImageCard
          image={images[3]}
          onOpen={(o) => open(3, o)}
          intrinsicAspect
        />

        {/* 5 — grounded mature ending, centred and narrower.
            Small additional top spacing acts as a gentle editorial exhale
            before the final image. Subtle, not a structural break. */}
        <div className="mt-2 grid grid-cols-1 gap-6 md:mt-4 md:grid-cols-12 md:gap-8">
          <div className="md:col-span-8 md:col-start-3">
            <GalleryImageCard
              image={images[4]}
              onOpen={(o) => open(4, o)}
              intrinsicAspect
            />
          </div>
        </div>
      </div>

      {openIndex !== null && (
        <Lightbox
          images={images}
          index={openIndex}
          setIndex={setOpenIndex}
          onClose={close}
          closing={closing}
          origin={origin}
          morphPhase={morphPhase}
        />
      )}
    </>
  );
}
