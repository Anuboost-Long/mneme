import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <svg width="180" height="180" viewBox="8 8 240 240" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="8" width="240" height="240" fill="#171B24" />
      <path
        d="M44 187V96C44 79.984 56.984 67 73 67s29 12.984 29 29v54c0 16.016 12.984 29 29 29s29-12.984 29-29V96c0-16.016 12.984-29 29-29s29 12.984 29 29v91"
        stroke="#EEF2E4"
        strokeWidth="20"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="44" cy="187" r="12" fill="#C5F74F" />
      <circle cx="196" cy="187" r="12" fill="#C5F74F" />
    </svg>,
    size
  );
}
