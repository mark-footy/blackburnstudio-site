"use client";

import Image from "next/image";
import { useRef } from "react";

import type { GalleryImage, MorphOrigin } from "@/components/gallery/types";

type GalleryImageCardProps = {
  image: GalleryImage;
  onOpen: (origin: MorphOrigin) => void;
  className?: string;
};

export function GalleryImageCard({
  image,
  onOpen,
  className = "",
}: GalleryImageCardProps) {
  const ref = useRef<HTMLButtonElement | null>(null);
  return (
    <button
      ref={ref}
      type="button"
      onClick={() => {
        const el = ref.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const borderRadius = window.getComputedStyle(el).borderRadius;
        onOpen({ rect, borderRadius });
      }}
      aria-label={`Open ${image.alt}`}
      className={`group relative block aspect-4/5 w-full cursor-pointer overflow-hidden rounded-2xl bg-neutral-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/60 ${className}`}
    >
      <Image
        src={image.src}
        alt={image.alt}
        fill
        sizes="(min-width: 768px) 50vw, 92vw"
        placeholder="blur"
        blurDataURL={image.blurDataURL}
        decoding="async"
        className="object-cover transition duration-700 ease-out md:group-hover:scale-[1.01]"
      />
    </button>
  );
}
