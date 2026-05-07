export type Orientation = "portrait" | "landscape" | "square";

export type GalleryImage = {
  id: number;
  src: string;
  alt: string;
  blurDataURL: string;
  width?: number;
  height?: number;
  orientation?: Orientation;
};

export type MorphOrigin = {
  rect: DOMRect;
  borderRadius: string;
};

export type MorphPhase = "opening" | "open" | "closing";

export type Axis = "none" | "x" | "y";
