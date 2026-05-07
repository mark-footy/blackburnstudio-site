import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { getPlaiceholder } from "plaiceholder";

import type { GalleryImage, Orientation } from "@/components/gallery/types";

// Re-exported for back-compat with existing imports.
export type PortraitImage = GalleryImage;

export type ImageSource = {
  id: number;
  file: string;
  alt: string;
};

const portraitSources: ImageSource[] = [
  { id: 1, file: "hero.jpg", alt: "Portrait in soft natural light" },
  { id: 2, file: "candid.jpg", alt: "Candid portrait with natural expression" },
  { id: 4, file: "male.jpg", alt: "Portrait in soft directional light" },
  { id: 3, file: "natural.jpg", alt: "Portrait in warm natural light outdoors" },
  { id: 6, file: "connection.jpg", alt: "Portrait capturing a quiet human moment" },
  { id: 7, file: "environment.jpg", alt: "Environmental portrait outdoors" },
  { id: 5, file: "moody.jpg", alt: "Portrait with subtle shadow and contrast" },
];

function deriveOrientation(width?: number, height?: number): Orientation | undefined {
  if (!width || !height) return undefined;
  if (width > height) return "landscape";
  if (height > width) return "portrait";
  return "square";
}

export async function getImagesWithBlur(
  folder: string = "portraits",
  imageSources: ImageSource[] = portraitSources,
): Promise<GalleryImage[]> {
  const dir = path.join(process.cwd(), "public", folder);
  return Promise.all(
    imageSources.map(async ({ id, file, alt }) => {
      const buffer = await fs.readFile(path.join(dir, file));
      const { base64, metadata } = await getPlaiceholder(buffer);
      return {
        id,
        src: `/${folder}/${file}`,
        alt,
        blurDataURL: base64,
        width: metadata?.width,
        height: metadata?.height,
        orientation: deriveOrientation(metadata?.width, metadata?.height),
      };
    }),
  );
}
