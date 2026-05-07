"use client";

import Image from "next/image";
import type { RefObject, TouchEvent as ReactTouchEvent } from "react";

import { EASE_PREMIUM, EASE_SNAP } from "@/components/gallery/lightbox/constants";
import type { GalleryImage, MorphPhase } from "@/components/gallery/types";

type CarouselTrackProps = {
  images: GalleryImage[];
  index: number;
  prevIndex: number;
  nextIndex: number;
  dragX: number;
  dragY: number;
  animating: boolean;
  closing: boolean;
  morphPhase: MorphPhase;
  slideGap: number;
  viewportWidth: number;
  viewportRef: RefObject<HTMLDivElement | null>;
  touchHandlers: {
    onTouchStart: (e: ReactTouchEvent) => void;
    onTouchMove: (e: ReactTouchEvent) => void;
    onTouchEnd: (e: ReactTouchEvent) => void;
  };
};

export function CarouselTrack({
  images,
  index,
  prevIndex,
  nextIndex,
  dragX,
  dragY,
  animating,
  closing,
  morphPhase,
  slideGap,
  viewportWidth,
  viewportRef,
  touchHandlers,
}: CarouselTrackProps) {
  // tactile feedback: scale + opacity falloff during vertical close drag
  const verticalCloseProgress = Math.min(Math.abs(dragY) / 140, 1);
  const verticalScale = 1 - verticalCloseProgress * 0.08;
  const verticalOpacity = 1 - verticalCloseProgress * 0.5;

  // horizontal drag progress (0–1) for active-image scale
  const dragProgress =
    viewportWidth > 0 ? Math.min(Math.abs(dragX) / viewportWidth, 1) : 0;
  const easedDragProgress = 1 - Math.pow(1 - dragProgress, 2);
  const activeScale = 1 - easedDragProgress * 0.05;

  const slides: { img: GalleryImage; offset: number }[] = [
    { img: images[prevIndex], offset: -1 },
    { img: images[index], offset: 0 },
    { img: images[nextIndex], offset: 1 },
  ];

  return (
    <div
      ref={viewportRef}
      onClick={(e) => e.stopPropagation()}
      onTouchStart={touchHandlers.onTouchStart}
      onTouchMove={touchHandlers.onTouchMove}
      onTouchEnd={touchHandlers.onTouchEnd}
      style={{
        transform: `translateY(${dragY}px) scale(${closing ? 0.98 : verticalScale})`,
        opacity:
          morphPhase === "open"
            ? closing
              ? 0
              : verticalOpacity
            : 0,
        transition: closing
          ? `transform 220ms ${EASE_PREMIUM}, opacity 220ms ${EASE_PREMIUM}`
          : animating
            ? `transform 260ms ${EASE_PREMIUM}, opacity 260ms ${EASE_PREMIUM}`
            : morphPhase === "open"
              ? `opacity 120ms ${EASE_PREMIUM} 80ms`
              : undefined,
        pointerEvents: morphPhase === "open" ? undefined : "none",
      }}
      className="relative z-10 h-[84vh] w-[92vw] max-w-[92vw] overflow-hidden bg-black touch-none select-none"
    >
      <div
        style={{
          transform: `translate3d(${dragX}px, 0, 0)`,
          transition: animating ? `transform 260ms ${EASE_SNAP}` : undefined,
        }}
        className="flex h-full w-full"
      >
        {slides.map(({ img, offset }) => {
          const isActive = offset === 0;
          // Side images dim baseline; incoming side image lifts toward 1 during drag.
          const incomingSign = dragX < 0 ? 1 : dragX > 0 ? -1 : 0;
          const isIncoming = !isActive && offset === incomingSign;
          const sideBase = 0.65;
          const sideOpacity = isIncoming
            ? sideBase + (1 - sideBase) * Math.pow(dragProgress, 1.4)
            : isActive
              ? 1
              : sideBase;
          const slideScale = isActive ? activeScale : 1;
          return (
            <div
              key={`${img.id}-${offset}`}
              style={{
                transform: `translateX(calc(${offset * 100}% + ${offset * slideGap}px)) scale(${slideScale})`,
                opacity: sideOpacity,
                left: 0,
                transition: animating
                  ? `transform 260ms ${EASE_PREMIUM}, opacity 260ms ${EASE_PREMIUM}`
                  : undefined,
              }}
              className="absolute inset-0 flex h-full w-full items-center justify-center"
            >
              <div className="relative h-full w-full overflow-hidden bg-black">
                <Image
                  src={img.src}
                  alt={img.alt}
                  fill
                  sizes="(min-width: 768px) 80vw, 92vw"
                  priority={isActive}
                  loading="eager"
                  placeholder="empty"
                  decoding="async"
                  draggable={false}
                  className="object-contain select-none"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
