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

const LANDSCAPE = "aspect-3/2";
const PORTRAIT = "aspect-4/5";

export default function FamiliesGrid({ images }: { images: GalleryImage[] }) {
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
  //  1 L  — cinematic opener, full-width
  //  2 P  | 3 L  — emotional intimacy (anchor + supporting landscape)
  //  4 P  | 5 P  — structured portraiture pair
  //  6 L  — storytelling breath, full-width
  //  7 L  | 8 L  — paired landscapes (environmental context)
  //  9 L  — emotional moment, full-width
  // 10 P  | 11 L — quiet duet
  // 12 P  — playful closing, centred narrower
  return (
    <>
      <div className="flex flex-col gap-8 md:gap-12">
        {/* 1 — cinematic opener */}
        <GalleryImageCard
          image={images[0]}
          onOpen={(o) => open(0, o)}
          aspectClassName={LANDSCAPE}
        />

        {/* 2 + 3 — emotional intimacy */}
        <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2 md:gap-8">
          <GalleryImageCard
            image={images[1]}
            onOpen={(o) => open(1, o)}
            aspectClassName={PORTRAIT}
          />
          <GalleryImageCard
            image={images[2]}
            onOpen={(o) => open(2, o)}
            aspectClassName={LANDSCAPE}
          />
        </div>

        {/* 4 + 5 — structured portraiture pair, narrowed and centred so two
            aspect-4/5 cards don't dominate the page rhythm */}
        <div className="mx-auto w-full md:max-w-4xl">
          <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2 md:gap-8">
            <GalleryImageCard
              image={images[3]}
              onOpen={(o) => open(3, o)}
              aspectClassName={PORTRAIT}
            />
            <GalleryImageCard
              image={images[4]}
              onOpen={(o) => open(4, o)}
              aspectClassName={PORTRAIT}
            />
          </div>
        </div>

        {/* 6 — storytelling breath, full-width */}
        <GalleryImageCard
          image={images[5]}
          onOpen={(o) => open(5, o)}
          aspectClassName={LANDSCAPE}
        />

        {/* 7 + 8 — paired landscapes */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
          <GalleryImageCard
            image={images[6]}
            onOpen={(o) => open(6, o)}
            aspectClassName={LANDSCAPE}
          />
          <GalleryImageCard
            image={images[7]}
            onOpen={(o) => open(7, o)}
            aspectClassName={LANDSCAPE}
          />
        </div>

        {/* 9 — emotional moment, full-width */}
        <GalleryImageCard
          image={images[8]}
          onOpen={(o) => open(8, o)}
          aspectClassName={LANDSCAPE}
        />

        {/* 10 + 11 — quiet duet */}
        <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2 md:gap-8">
          <GalleryImageCard
            image={images[9]}
            onOpen={(o) => open(9, o)}
            aspectClassName={PORTRAIT}
          />
          <GalleryImageCard
            image={images[10]}
            onOpen={(o) => open(10, o)}
            aspectClassName={LANDSCAPE}
          />
        </div>

        {/* 12 — playful closing, centred and narrower */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-12 md:gap-8">
          <div className="md:col-span-6 md:col-start-4">
            <GalleryImageCard
              image={images[11]}
              onOpen={(o) => open(11, o)}
              aspectClassName={PORTRAIT}
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
