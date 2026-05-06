"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { EASE_MORPH, EASE_PREMIUM, MORPH_DURATION } from "@/components/gallery/lightbox/constants";
import type { GalleryImage, MorphOrigin, MorphPhase } from "@/components/gallery/types";

function computeCenteredRect() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const w = vw * 0.92;
  const h = vh * 0.84;
  return {
    top: (vh - h) / 2,
    left: (vw - w) / 2,
    width: w,
    height: h,
  };
}

export function MorphOverlay({
  image,
  origin,
  phase,
}: {
  image: GalleryImage;
  origin: MorphOrigin | null;
  phase: MorphPhase;
}) {
  const [style, setStyle] = useState<React.CSSProperties | null>(null);

  useEffect(() => {
    if (phase === "open") {
      setStyle(null);
      return;
    }
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const round = (v: number) => Math.round(v);
    const target = computeCenteredRect();
    const originRect = origin?.rect ?? null;
    const originRadius = origin?.borderRadius ?? "0px";
    const initial = originRect ?? target;
    const start: React.CSSProperties = {
      position: "fixed",
      top: round(phase === "opening" ? initial.top : target.top) + "px",
      left: round(phase === "opening" ? initial.left : target.left) + "px",
      width:
        round(phase === "opening" ? initial.width : target.width) + "px",
      height:
        round(phase === "opening" ? initial.height : target.height) + "px",
      transform:
        (phase === "opening" ? "scale(0.98)" : "scale(1)") + " translateZ(0)",
      opacity: phase === "opening" ? (originRect ? 1 : 0) : 1,
      transition: "none",
      borderRadius:
        phase === "opening" && originRect ? originRadius : "0px",
      overflow: "hidden",
      backgroundColor: "#000",
      zIndex: 60,
      willChange: "transform, top, left, width, height, opacity",
      pointerEvents: "none",
    };
    // Write initial style synchronously so the browser commits it before
    // the rAF that triggers the animated end state — prevents a 1-frame flash.
    setStyle(start);
    if (reduce) {
      // Skip morph: jump to fade
      requestAnimationFrame(() => {
        setStyle({
          ...start,
          opacity: phase === "opening" ? 1 : 0,
          transition: `opacity 180ms ${EASE_PREMIUM}`,
        });
      });
      return;
    }
    const raf = requestAnimationFrame(() => {
      const end =
        phase === "opening"
          ? {
              top: round(target.top),
              left: round(target.left),
              width: round(target.width),
              height: round(target.height),
              transform: "scale(1) translateZ(0)",
              opacity: 1,
              borderRadius: "0px",
            }
          : {
              top: round((originRect ?? target).top),
              left: round((originRect ?? target).left),
              width: round((originRect ?? target).width),
              height: round((originRect ?? target).height),
              transform: "scale(0.98) translateZ(0)",
              opacity: originRect ? 1 : 0,
              borderRadius: originRect ? originRadius : "0px",
            };
      setStyle({
        ...start,
        ...end,
        transition: `top ${MORPH_DURATION}ms ${EASE_MORPH}, left ${MORPH_DURATION}ms ${EASE_MORPH}, width ${MORPH_DURATION}ms ${EASE_MORPH}, height ${MORPH_DURATION}ms ${EASE_MORPH}, transform ${MORPH_DURATION}ms ${EASE_MORPH}, opacity ${MORPH_DURATION}ms ${EASE_MORPH}, border-radius ${MORPH_DURATION}ms ${EASE_MORPH}`,
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [phase, origin]);

  if (phase === "open" || !style) return null;

  const hasOrigin = !!origin;
  return (
    <div style={style}>
      <Image
        src={image.src}
        alt={image.alt}
        fill
        sizes="(min-width: 768px) 80vw, 92vw"
        placeholder="blur"
        blurDataURL={image.blurDataURL}
        decoding="async"
        draggable={false}
        priority
        className={
          phase === "opening" || hasOrigin
            ? "object-cover select-none"
            : "object-contain select-none"
        }
      />
    </div>
  );
}
