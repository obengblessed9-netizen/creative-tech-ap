import { useEffect, useRef } from "react";

interface VideoTileProps {
  stream?: MediaStream | null;
  fallbackGradient: string;
  name: string;
  showLive?: boolean;
  className?: string;
  muted?: boolean;
  /** Render as a focusable, accessible region with keyboard activation. */
  focusable?: boolean;
  /** Override the accessible label. Defaults to `${name}${showLive ? ', live host on air' : ''}`. */
  ariaLabel?: string;
  onActivate?: () => void;
  role?: string;
}

export function VideoTile({
  stream,
  fallbackGradient,
  name,
  showLive,
  className = "",
  muted = true,
  focusable = false,
  ariaLabel,
  onActivate,
  role,
}: VideoTileProps) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (ref.current && stream) {
      ref.current.srcObject = stream;
    }
  }, [stream]);

  const label =
    ariaLabel ??
    `${name}${showLive ? ", live host on air" : ", participant video"}`;

  const interactive = focusable || !!onActivate;

  return (
    <div
      className={`relative rounded-md overflow-hidden bg-gradient-to-br ${fallbackGradient} ${className} ${
        interactive
          ? "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background cursor-pointer"
          : ""
      }`}
      role={role ?? (interactive ? "button" : "img")}
      aria-label={label}
      tabIndex={interactive ? 0 : undefined}
      onClick={onActivate}
      onKeyDown={
        onActivate
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onActivate();
              }
            }
          : undefined
      }
    >
      {stream ? (
        <video
          ref={ref}
          autoPlay
          playsInline
          muted={muted}
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-black/20" aria-hidden="true" />
      )}
      {showLive && (
        <span
          className="absolute top-1.5 right-1.5 bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1"
          aria-hidden="true"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          LIVE
        </span>
      )}
      <div className="absolute bottom-1.5 left-1.5 right-1.5">
        <span
          className="inline-block bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded"
          aria-hidden="true"
        >
          {name}
        </span>
      </div>
    </div>
  );
}
