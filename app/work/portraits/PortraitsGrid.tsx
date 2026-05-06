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

// Keep PortraitImage exported for back-compat with the server data layer.
export type PortraitImage = GalleryImage;

export default function PortraitsGrid({ images }: { images: GalleryImage[] }) {
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

  return (
    <>
      <div className="flex flex-col gap-8 md:gap-12">
        {/* Row 1: hero large + candid medium */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
          <GalleryImageCard
            image={images[0]}
            onOpen={(o) => open(0, o)}
            className="md:col-span-2"
          />
          <GalleryImageCard image={images[1]} onOpen={(o) => open(1, o)} />
        </div>

        {/* Row 2: male + natural */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
          <GalleryImageCard image={images[2]} onOpen={(o) => open(2, o)} />
          <GalleryImageCard image={images[3]} onOpen={(o) => open(3, o)} />
        </div>

        {/* Row 3: connection + environment */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
          <GalleryImageCard image={images[4]} onOpen={(o) => open(4, o)} />
          <GalleryImageCard image={images[5]} onOpen={(o) => open(5, o)} />
        </div>

        {/* Row 4: moody, centred */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-4 md:gap-8">
          <GalleryImageCard
            image={images[6]}
            onOpen={(o) => open(6, o)}
            className="md:col-start-2 md:col-span-2"
          />
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
