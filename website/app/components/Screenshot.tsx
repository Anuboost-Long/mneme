import { getImageProps } from "next/image";

export const SHOT_WIDTH = 2400;
export const SHOT_HEIGHT = 1506;
export const CROPPED_HEIGHT = 1080;

export default function Screenshot({
  name,
  alt,
  sizes = "(min-width: 1280px) 1200px, 100vw",
  priority = false,
  height = SHOT_HEIGHT,
  className = ""
}: Readonly<{
  name: string;
  alt: string;
  sizes?: string;
  priority?: boolean;
  height?: number;
  className?: string;
}>) {
  const common = { alt, sizes, width: SHOT_WIDTH, height, priority };
  const {
    props: { srcSet: dark }
  } = getImageProps({ ...common, src: `/screenshots/${name}-dark.jpg` });
  const { props: light } = getImageProps({ ...common, src: `/screenshots/${name}-light.jpg` });

  return (
    <picture
      className={`block overflow-hidden rounded-2xl border border-line bg-raised shot-shadow ${className}`}
    >
      <source media="(prefers-color-scheme: dark)" srcSet={dark} />
      <img {...light} alt={alt} className="block h-auto w-full" />
    </picture>
  );
}
