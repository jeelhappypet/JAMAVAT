import Image from "next/image";

// Matches public/brand/logo.png's actual aspect ratio, so the wordmark and
// tagline baked into the artwork never get squeezed/distorted.
const LOGO_ASPECT = 600 / 558;

const HEIGHT_PX: Record<"sm" | "md" | "lg", number> = {
  sm: 48,
  md: 96,
  lg: 176,
};

interface AppLogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function AppLogo({ size = "md", className = "" }: AppLogoProps) {
  const height = HEIGHT_PX[size];
  const width = Math.round(height * LOGO_ASPECT);

  return (
    <Image
      src="/brand/logo.png"
      alt="જમાવટ — રેસ્ટોરન્ટ મેનેજમેન્ટ સોફ્ટવેર"
      width={width}
      height={height}
      className={className}
      unoptimized
      priority
    />
  );
}
