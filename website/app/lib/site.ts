const distRepo = "https://github.com/Anuboost-Long/mneme-dist";

export const releasesUrl = `${distRepo}/releases/latest`;
export const diskImageUrl = (arch: "arm64" | "x64") => `${releasesUrl}/download/mneme-${arch}.dmg`;
export const installCommand =
  "curl -fsSL https://raw.githubusercontent.com/Anuboost-Long/mneme-dist/main/install.sh | bash";
export const unquarantineCommand = "xattr -dr com.apple.quarantine /Applications/mneme.app";

export const navLinks = [
  ["Features", "/features"],
  ["How it works", "/workflow"],
  ["Privacy", "/privacy"]
] as const;
