import clsx from "clsx";
import { createElement, type HTMLAttributes } from "react";

type Variant = "pageTitle" | "sectionTitle" | "itemTitle" | "body" | "caption" | "label";
type Tone = "text" | "muted" | "error" | "inherit";

type TypographyProps = HTMLAttributes<HTMLElement> & {
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span" | "div" | "legend";
  variant?: Variant;
  tone?: Tone;
};

const variants: Record<Variant, string> = {
  pageTitle: "text-3xl font-semibold tracking-tight",
  sectionTitle: "text-xl font-semibold tracking-tight",
  itemTitle: "text-base font-medium",
  body: "text-sm leading-6",
  caption: "text-xs leading-5",
  label: "text-sm font-medium",
};

const tones: Record<Tone, string> = {
  text: "text-ink",
  muted: "text-muted",
  error: "text-danger",
  inherit: "text-inherit",
};

export function Typography({
  as,
  variant = "body",
  tone = "text",
  className,
  children,
  ...props
}: Readonly<TypographyProps>) {
  return createElement(as ?? "p", {
    ...props,
    className: clsx(variants[variant], tones[tone], className),
  }, children);
}

export function PageTitle(props: Readonly<Omit<TypographyProps, "variant">>) {
  return <Typography {...props} as={props.as ?? "h1"} variant="pageTitle" />;
}

export function SectionTitle(props: Readonly<Omit<TypographyProps, "variant">>) {
  return <Typography {...props} as={props.as ?? "h2"} variant="sectionTitle" />;
}

export function BodyText(props: Readonly<Omit<TypographyProps, "variant">>) {
  return <Typography {...props} as={props.as ?? "p"} variant="body" />;
}

export function Caption(props: Readonly<Omit<TypographyProps, "variant">>) {
  return <Typography {...props} as={props.as ?? "p"} variant="caption" />;
}
