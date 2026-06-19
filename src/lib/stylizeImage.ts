// Client-side image-to-drawn-art stylization
// All effects run on a 2D canvas — no external deps.

export type StyleId =
  | "pencil"
  | "ink"
  | "charcoal"
  | "crosshatch"
  | "watercolor"
  | "popart"
  | "posterize";

export type PaletteId =
  | "mono"
  | "sepia"
  | "blueprint"
  | "vibrant"
  | "pastel"
  | "noir"
  | "custom";

export const STYLES: { id: StyleId; label: string; description: string }[] = [
  { id: "pencil", label: "Pencil sketch", description: "Soft graphite lines on paper" },
  { id: "ink", label: "Ink outline", description: "Bold contour lines" },
  { id: "charcoal", label: "Charcoal", description: "Smoky textured strokes" },
  { id: "crosshatch", label: "Cross-hatch", description: "Diagonal shading lines" },
  { id: "watercolor", label: "Watercolor wash", description: "Soft posterized washes" },
  { id: "popart", label: "Pop art", description: "Flat bold color blocks" },
  { id: "posterize", label: "Posterize", description: "Reduced color levels" },
];

type Palette = { name: string; fg: string; bg: string; accents: string[] };

export const PALETTES: Record<Exclude<PaletteId, "custom">, Palette> = {
  mono: { name: "Monochrome", fg: "#111111", bg: "#ffffff", accents: ["#444444", "#888888", "#bbbbbb"] },
  sepia: { name: "Sepia", fg: "#3a2410", bg: "#f5e6d3", accents: ["#a86b3c", "#d4a373", "#7a4a23"] },
  blueprint: { name: "Blueprint", fg: "#e8eef9", bg: "#0b3d91", accents: ["#7da3e8", "#2257c4", "#bcd0f0"] },
  vibrant: { name: "Vibrant", fg: "#0a0a0a", bg: "#fffceb", accents: ["#e63946", "#2a9d8f", "#3a86ff", "#ffbe0b"] },
  pastel: { name: "Pastel", fg: "#3a3a3a", bg: "#fff5f8", accents: ["#ffadad", "#a0c4ff", "#caffbf", "#ffd6a5"] },
  noir: { name: "Noir", fg: "#f5f5f5", bg: "#0a0a0a", accents: ["#cc0000", "#888888", "#444444"] },
};

export const PALETTE_OPTIONS: { id: PaletteId; label: string; swatch: string[] }[] = [
  { id: "mono", label: "Monochrome", swatch: ["#ffffff", "#888", "#111"] },
  { id: "sepia", label: "Sepia", swatch: ["#f5e6d3", "#d4a373", "#3a2410"] },
  { id: "blueprint", label: "Blueprint", swatch: ["#0b3d91", "#2257c4", "#e8eef9"] },
  { id: "vibrant", label: "Vibrant", swatch: ["#e63946", "#2a9d8f", "#3a86ff", "#ffbe0b"] },
  { id: "pastel", label: "Pastel", swatch: ["#ffadad", "#a0c4ff", "#caffbf", "#ffd6a5"] },
  { id: "noir", label: "Noir", swatch: ["#000", "#cc0000", "#f5f5f5"] },
  { id: "custom", label: "Custom", swatch: ["#1a1a1a", "#c9a84c", "#fff"] },
];

const hexToRgb = (hex: string): [number, number, number] => {
  const h = hex.replace("#", "");
  const v = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
};

const resolvePalette = (id: PaletteId, customColor: string): Palette => {
  if (id === "custom") {
    return { name: "Custom", fg: customColor, bg: "#ffffff", accents: [customColor, "#888", "#cccccc"] };
  }
  return PALETTES[id];
};

const drawFitted = (ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number, bg: string) => {
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  const ir = img.width / img.height;
  const cr = w / h;
  let dw: number, dh: number;
  if (ir > cr) { dw = w; dh = w / ir; } else { dh = h; dw = h * ir; }
  const dx = (w - dw) / 2;
  const dy = (h - dh) / 2;
  ctx.drawImage(img, dx, dy, dw, dh);
};

const toGray = (data: Uint8ClampedArray): Float32Array => {
  const g = new Float32Array(data.length / 4);
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    g[j] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  return g;
};

// Sobel edge magnitude 0..1
const sobel = (gray: Float32Array, w: number, h: number): Float32Array => {
  const out = new Float32Array(gray.length);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const tl = gray[i - w - 1], tc = gray[i - w], tr = gray[i - w + 1];
      const ml = gray[i - 1], mr = gray[i + 1];
      const bl = gray[i + w - 1], bc = gray[i + w], br = gray[i + w + 1];
      const gx = -tl - 2 * ml - bl + tr + 2 * mr + br;
      const gy = -tl - 2 * tc - tr + bl + 2 * bc + br;
      out[i] = Math.min(1, Math.hypot(gx, gy) / 360);
    }
  }
  return out;
};

const posterizeChannel = (v: number, levels: number) => {
  const step = 255 / (levels - 1);
  return Math.round(Math.round(v / step) * step);
};

export type StylizeOptions = {
  style: StyleId;
  palette: PaletteId;
  intensity: number; // 1..100
  customColor?: string;
};

export async function stylizeImage(
  src: HTMLImageElement | string,
  width: number,
  height: number,
  opts: StylizeOptions,
): Promise<HTMLCanvasElement> {
  const img = typeof src === "string" ? await loadImage(src) : src;
  const pal = resolvePalette(opts.palette, opts.customColor ?? "#1a1a1a");
  const intensity = Math.max(1, Math.min(100, opts.intensity)) / 100;

  // Internal working size — keep modest for speed
  const maxDim = 900;
  const ratio = Math.min(1, maxDim / Math.max(width, height));
  const W = Math.max(64, Math.round(width * ratio));
  const H = Math.max(64, Math.round(height * ratio));

  const work = document.createElement("canvas");
  work.width = W; work.height = H;
  const wctx = work.getContext("2d")!;
  drawFitted(wctx, img, W, H, pal.bg);

  const src2 = wctx.getImageData(0, 0, W, H);
  const out = wctx.createImageData(W, H);
  const gray = toGray(src2.data);

  const [fr, fg, fb] = hexToRgb(pal.fg);
  const [br, bg2, bb] = hexToRgb(pal.bg);
  const accents = pal.accents.map(hexToRgb);

  const setOut = (i: number, r: number, g: number, b: number, a = 255) => {
    out.data[i] = r; out.data[i + 1] = g; out.data[i + 2] = b; out.data[i + 3] = a;
  };

  if (opts.style === "pencil" || opts.style === "ink" || opts.style === "charcoal" || opts.style === "crosshatch") {
    const edges = sobel(gray, W, H);
    const threshold = opts.style === "ink" ? 0.18 - intensity * 0.12 : 0.08 - intensity * 0.05;
    for (let i = 0, p = 0; i < edges.length; i++, p += 4) {
      // start with paper
      setOut(p, br, bg2, bb, 255);
      const e = edges[i];
      let line = 0;
      if (opts.style === "ink") {
        line = e > threshold ? 1 : 0;
      } else if (opts.style === "pencil") {
        line = Math.max(0, (e - threshold)) * (1.5 + intensity * 2);
      } else if (opts.style === "charcoal") {
        const noise = (Math.random() - 0.5) * 0.15 * intensity;
        line = Math.max(0, e - threshold + noise) * (2 + intensity * 2);
      } else {
        // crosshatch handled below; keep edge for outline
        line = e > threshold ? Math.min(1, e * 1.5) : 0;
      }
      line = Math.min(1, line);
      if (line > 0) {
        const r = br + (fr - br) * line;
        const g = bg2 + (fg - bg2) * line;
        const b = bb + (fb - bb) * line;
        setOut(p, r, g, b, 255);
      }
    }

    if (opts.style === "pencil" || opts.style === "charcoal") {
      // add tonal shading from inverted brightness
      for (let i = 0, p = 0; i < gray.length; i++, p += 4) {
        const shade = (1 - gray[i] / 255) * 0.35 * intensity;
        if (shade > 0.02) {
          out.data[p] = out.data[p] * (1 - shade) + fr * shade;
          out.data[p + 1] = out.data[p + 1] * (1 - shade) + fg * shade;
          out.data[p + 2] = out.data[p + 2] * (1 - shade) + fb * shade;
        }
      }
    }

    wctx.putImageData(out, 0, 0);

    if (opts.style === "crosshatch") {
      // overlay diagonal lines weighted by darkness
      const spacing = Math.max(3, Math.round(8 - intensity * 5));
      wctx.save();
      wctx.strokeStyle = `rgba(${fr},${fg},${fb},${0.35 + intensity * 0.4})`;
      wctx.lineWidth = 0.6;
      wctx.globalCompositeOperation = "multiply";
      for (let d = -H; d < W; d += spacing) {
        wctx.beginPath();
        wctx.moveTo(d, 0);
        wctx.lineTo(d + H, H);
        wctx.stroke();
      }
      for (let d = 0; d < W + H; d += spacing * 2) {
        wctx.beginPath();
        wctx.moveTo(d, 0);
        wctx.lineTo(d - H, H);
        wctx.stroke();
      }
      wctx.restore();
    }
  } else if (opts.style === "watercolor") {
    // blurred + posterized + soft edge tint
    const levels = Math.max(3, Math.round(7 - intensity * 3));
    const tmp = document.createElement("canvas");
    tmp.width = W; tmp.height = H;
    const tctx = tmp.getContext("2d")!;
    tctx.filter = `blur(${2 + intensity * 3}px) saturate(${1 + intensity}) `;
    tctx.drawImage(work, 0, 0);
    const blurred = tctx.getImageData(0, 0, W, H);
    for (let i = 0; i < blurred.data.length; i += 4) {
      const r = posterizeChannel(blurred.data[i], levels);
      const g = posterizeChannel(blurred.data[i + 1], levels);
      const b = posterizeChannel(blurred.data[i + 2], levels);
      // tint toward palette bg slightly for "paper" feel
      blurred.data[i] = r * 0.85 + br * 0.15;
      blurred.data[i + 1] = g * 0.85 + bg2 * 0.15;
      blurred.data[i + 2] = b * 0.85 + bb * 0.15;
    }
    wctx.putImageData(blurred, 0, 0);
    // soft edge outline
    const edges = sobel(gray, W, H);
    const overlay = wctx.getImageData(0, 0, W, H);
    for (let i = 0, p = 0; i < edges.length; i++, p += 4) {
      const e = edges[i];
      if (e > 0.1) {
        const k = Math.min(1, (e - 0.1) * 2);
        overlay.data[p] = overlay.data[p] * (1 - k * 0.5) + fr * k * 0.5;
        overlay.data[p + 1] = overlay.data[p + 1] * (1 - k * 0.5) + fg * k * 0.5;
        overlay.data[p + 2] = overlay.data[p + 2] * (1 - k * 0.5) + fb * k * 0.5;
      }
    }
    wctx.putImageData(overlay, 0, 0);
  } else if (opts.style === "popart" || opts.style === "posterize") {
    const levels = Math.max(2, Math.round(6 - intensity * 4));
    // Map brightness buckets to palette colors (popart) or just posterize RGB.
    if (opts.style === "popart") {
      const buckets = [hexToRgb(pal.bg), ...accents, hexToRgb(pal.fg)];
      for (let i = 0, p = 0; i < gray.length; i++, p += 4) {
        const v = gray[i] / 255;
        const idx = Math.min(buckets.length - 1, Math.floor(v * buckets.length));
        const [r, g, b] = buckets[buckets.length - 1 - idx];
        setOut(p, r, g, b, 255);
      }
      wctx.putImageData(out, 0, 0);
    } else {
      for (let i = 0; i < src2.data.length; i += 4) {
        src2.data[i] = posterizeChannel(src2.data[i], levels);
        src2.data[i + 1] = posterizeChannel(src2.data[i + 1], levels);
        src2.data[i + 2] = posterizeChannel(src2.data[i + 2], levels);
      }
      wctx.putImageData(src2, 0, 0);
    }
  }

  // Upscale to final size
  const final = document.createElement("canvas");
  final.width = width; final.height = height;
  const fctx = final.getContext("2d")!;
  fctx.imageSmoothingEnabled = true;
  fctx.imageSmoothingQuality = "high";
  fctx.drawImage(work, 0, 0, width, height);
  return final;
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
