import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { getPlaiceholder } from "plaiceholder";

export type PortraitImage = {
  id: number;
  src: string;
  alt: string;
  blurDataURL: string;
};

type PortraitSource = {
  id: number;
  file: string;
  alt: string;
};

const sources: PortraitSource[] = [
  { id: 1, file: "hero.jpg", alt: "Portrait in soft natural light" },
  { id: 2, file: "candid.jpg", alt: "Candid portrait with natural expression" },
  { id: 4, file: "male.jpg", alt: "Portrait in soft directional light" },
  { id: 3, file: "natural.jpg", alt: "Portrait in warm natural light outdoors" },
  { id: 6, file: "connection.jpg", alt: "Portrait capturing a quiet human moment" },
  { id: 7, file: "environment.jpg", alt: "Environmental portrait outdoors" },
  { id: 5, file: "moody.jpg", alt: "Portrait with subtle shadow and contrast" },
];

export async function getImagesWithBlur(): Promise<PortraitImage[]> {
  const dir = path.join(process.cwd(), "public", "portraits");
  return Promise.all(
    sources.map(async ({ id, file, alt }) => {
      const buffer = await fs.readFile(path.join(dir, file));
      const { base64 } = await getPlaiceholder(buffer);
      return {
        id,
        src: `/portraits/${file}`,
        alt,
        blurDataURL: base64,
      };
    }),
  );
}
