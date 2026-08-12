import Image from "next/image";

const SIZE_PX: Record<"sm" | "md" | "lg", number> = {
  sm: 32,
  md: 48,
  lg: 96,
};

interface AppLogoProps {
  size?: "sm" | "md" | "lg";
  withWordmark?: boolean;
  className?: string;
}

export function AppLogo({ size = "md", withWordmark = true, className = "" }: AppLogoProps) {
  const px = SIZE_PX[size];

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <Image
        src="/brand/logo.png"
        alt="જમાવટ"
        width={px}
        height={px}
        className="rounded-xl"
        priority
      />
      {withWordmark ? (
        <span
          className="font-bold text-brand"
          style={{ fontSize: px * 0.5 }}
        >
          જમાવટ
        </span>
      ) : null}
    </div>
  );
}
