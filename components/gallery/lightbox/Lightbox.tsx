"use client";

import { useEffect, useRef } from "react";

import { CarouselTrack } from "@/components/gallery/lightbox/CarouselTrack";
import { LightboxControls } from "@/components/gallery/lightbox/LightboxControls";
import { MorphOverlay } from "@/components/gallery/lightbox/MorphOverlay";
import { EASE_PREMIUM, MORPH_DURATION } from "@/components/gallery/lightbox/constants";
import { useLightboxGestures } from "@/components/gallery/lightbox/useLightboxGestures";
import { useScrollLock } from "@/components/gallery/lightbox/useScrollLock";
import type { GalleryImage, MorphOrigin, MorphPhase } from "@/components/gallery/types";

type LightboxProps = {
  images: GalleryImage[];
  index: number;
  setIndex: (i: number) => void;
  onClose: () => void;
  closing: boolean;
  origin: MorphOrigin | null;
  morphPhase: MorphPhase;
};

export function Lightbox({
  images,
  index,
  setIndex,
  onClose,
  closing,
  origin,
  morphPhase,
}: LightboxProps) {
  const total = images.length;
  const viewportRef = useRef<HTMLDivElement | null>(null);

  useScrollLock(true);

  const {
    dragX,
    dragY,
    animating,
    slideGap,
    viewportWidth,
    prevIndex,
    nextIndex,
    goPrev,
    goNext,
    touchHandlers,
  } = useLightboxGestures({
    viewportRef,
    index,
    total,
    setIndex,
    onClose,
  });

  // keyboard navigation — kept here so it can call into the gestures' goPrev/goNext
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev, onClose]);

  // backdrop opacity reduces during vertical close drag
  const closeProgress = Math.min(Math.abs(dragY) / 300, 0.6);
  // backdrop blur ramps up while open, eases off during vertical close drag
  const backdropBlurPx =
    morphPhase === "open" && !closing
      ? Math.max(0, 8 - (closeProgress / 0.6) * 8)
      : 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Image viewer"
      onClick={onClose}
      style={{
        backgroundColor: `rgba(0,0,0,${(closing || morphPhase === "closing" ? 0 : 0.95) - closeProgress})`,
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
        backdropFilter: `blur(${backdropBlurPx}px)`,
        WebkitBackdropFilter: `blur(${backdropBlurPx}px)`,
        transition: `background-color ${MORPH_DURATION}ms ${EASE_PREMIUM}, backdrop-filter ${MORPH_DURATION}ms ${EASE_PREMIUM}`,
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <LightboxControls
        index={index}
        total={total}
        onClose={onClose}
        onPrev={goPrev}
        onNext={goNext}
      />

      <CarouselTrack
        images={images}
        index={index}
        prevIndex={prevIndex}
        nextIndex={nextIndex}
        dragX={dragX}
        dragY={dragY}
        animating={animating}
        closing={closing}
        morphPhase={morphPhase}
        slideGap={slideGap}
        viewportWidth={viewportWidth}
        viewportRef={viewportRef}
        touchHandlers={touchHandlers}
      />

      <MorphOverlay
        image={images[index]}
        origin={origin}
        phase={morphPhase}
      />
    </div>
  );
}
