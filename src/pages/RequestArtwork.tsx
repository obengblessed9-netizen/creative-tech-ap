import { useCallback, useEffect, useRef, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { stylizeImage, loadImage, STYLES, PALETTE_OPTIONS, type StyleId, type PaletteId } from "@/lib/stylizeImage";
import {
  Brush,
  Eraser,
  Square,
  Circle as CircleIcon,
  Minus,
  Type as TypeIcon,
  PaintBucket,
  Undo2,
  Redo2,
  Download,
  Trash2,
  Plus,
  Eye,
  EyeOff,
  Layers as LayersIcon,
  Upload,
  X,
  Send,
  ImagePlus,
  Move,
  RotateCw,
  Check,
  Sparkles,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

type Tool = "brush" | "eraser" | "line" | "rect" | "ellipse" | "text" | "fill";

const CATEGORIES: { label: string; tools: Tool[] }[] = [
  { label: "🎨 Painting", tools: ["brush", "fill", "ellipse", "rect", "line", "eraser"] },
  { label: "✏️ Drawing", tools: ["brush", "eraser", "line", "text"] },
  { label: "💻 Digital Art", tools: ["brush", "eraser", "line", "rect", "ellipse", "text", "fill"] },
  { label: "🗿 Sculpture", tools: ["brush", "line", "rect", "ellipse", "eraser"] },
  { label: "🧵 Textile", tools: ["brush", "fill", "text", "eraser"] },
  { label: "🖌️ Calligraphy", tools: ["brush", "text", "eraser"] },
  { label: "🧩 Graphic Design", tools: ["brush", "eraser", "line", "rect", "ellipse", "text", "fill"] },
  { label: "🖼️ Print", tools: ["brush", "fill", "rect", "ellipse", "text", "eraser"] },
];

const CANVAS_W = 1200;
const CANVAS_H = 720;

const SWATCHES = [
  "#1a1a1a", "#ffffff", "#e63946", "#f4a261", "#e9c46a",
  "#2a9d8f", "#264653", "#3a86ff", "#8338ec", "#ff006e",
  "#6b4423", "#c9a84c",
];

const DRAFT_KEY = "agms_artwork_request_draft_v1";
const SKETCH_KEY = "agms_artwork_request_sketch_v1";

const BG_PRESETS: { name: string; color: string }[] = [
  { name: "Clean white", color: "#ffffff" },
  { name: "Cream paper", color: "#f5ecd9" },
  { name: "Warm sand", color: "#efe3c8" },
  { name: "Cool gray", color: "#e8edf1" },
  { name: "Slate", color: "#1f2933" },
  { name: "Charcoal", color: "#111111" },
  { name: "Sage", color: "#cdd9c4" },
  { name: "Blush", color: "#f7d9d3" },
  { name: "Sky", color: "#cfe6f7" },
  { name: "Noir gold", color: "#0d0d0d" },
];

type ImportedMeta = {
  srcDataUrl: string;
  style: StyleId;
  palette: PaletteId;
  intensity: number;
  customColor: string;
};

type LayerTransform = { tx: number; ty: number; scale: number; rot: number };

type Layer = {
  id: string;
  name: string;
  visible: boolean;
  canvas: HTMLCanvasElement;
  imported?: ImportedMeta;
  pending?: LayerTransform; // when set, layer is being positioned and not yet baked
};

const newCanvas = () => {
  const c = document.createElement("canvas");
  c.width = CANVAS_W;
  c.height = CANVAS_H;
  return c;
};

const IDENTITY_TRANSFORM: LayerTransform = { tx: 0, ty: 0, scale: 1, rot: 0 };


const RequestArtwork = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [category, setCategory] = useState<string>("");
  const [tool, setTool] = useState<Tool>("brush");
  const [color, setColor] = useState("#1a1a1a");
  const [size, setSize] = useState(6);
  const [opacity, setOpacity] = useState(100);
  const [textInput, setTextInput] = useState("Your text");
  const [layers, setLayers] = useState<Layer[]>([]);
  const [activeLayerId, setActiveLayerId] = useState<string>("");
  const [history, setHistory] = useState<ImageData[][]>([]);
  const [future, setFuture] = useState<ImageData[][]>([]);

  // Request submission state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  const [refFiles, setRefFiles] = useState<File[]>([]);
  const [refPreviews, setRefPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [cursorTip, setCursorTip] = useState<{ x: number; y: number; show: boolean }>({ x: 0, y: 0, show: false });
  const [draftRestored, setDraftRestored] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // Zoom & pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const pinchRef = useRef<{ dist: number; cx: number; cy: number; zoom: number; pan: { x: number; y: number } } | null>(null);
  const multiTouch = useRef(false);

  const displayRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null); // overlay for shape preview
  const drawing = useRef(false);
  const startPt = useRef<{ x: number; y: number } | null>(null);
  const lastPt = useRef<{ x: number; y: number } | null>(null);

  // Import-artwork dialog state
  const [importOpen, setImportOpen] = useState(false);
  const [importSrc, setImportSrc] = useState<string | null>(null);
  const [importStyle, setImportStyle] = useState<StyleId>("pencil");
  const [importPalette, setImportPalette] = useState<PaletteId>("mono");
  const [importIntensity, setImportIntensity] = useState(60);
  const [importBusy, setImportBusy] = useState(false);
  const [restylizeLayerId, setRestylizeLayerId] = useState<string | null>(null);
  const importPreviewRef = useRef<HTMLCanvasElement>(null);
  const importImgRef = useRef<HTMLImageElement | null>(null);

  // Background + AI suggest
  const [bgColor, setBgColor] = useState<string>("#ffffff");
  const [bgSuggesting, setBgSuggesting] = useState(false);
  const [bgSuggestion, setBgSuggestion] = useState<{ color: string; name: string; reason: string } | null>(null);

  // Drag-and-drop on canvas
  const [dragOver, setDragOver] = useState(false);



  // Initialize first layer
  useEffect(() => {
    if (layers.length === 0) {
      const id = crypto.randomUUID();
      setLayers([{ id, name: "Layer 1", visible: true, canvas: newCanvas() }]);
      setActiveLayerId(id);
    }
  }, [layers.length]);

  // Detect touch device
  useEffect(() => {
    const mql = window.matchMedia("(pointer: coarse)");
    setIsTouchDevice(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsTouchDevice(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  // Restore draft on mount (form fields + sketch image)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d.title) setTitle(d.title);
        if (d.description) setDescription(d.description);
        if (d.budget) setBudget(d.budget);
        if (d.category) setCategory(d.category);
        if (d.color) setColor(d.color);
        if (typeof d.size === "number") setSize(d.size);
        if (typeof d.opacity === "number") setOpacity(d.opacity);
        if (d.title || d.description || d.budget || d.category) {
          setDraftRestored(true);
          toast.success("Draft restored — pick up where you left off", { duration: 3500 });
        }
      }
    } catch {}
  }, []);

  // Restore sketch onto first layer once layers initialized
  useEffect(() => {
    if (layers.length === 0 || draftRestored === false) return;
    const dataUrl = localStorage.getItem(SKETCH_KEY);
    if (!dataUrl) return;
    const img = new Image();
    img.onload = () => {
      const target = layers[0];
      if (target) {
        target.canvas.getContext("2d")!.drawImage(img, 0, 0, CANVAS_W, CANVAS_H);
        composite();
      }
    };
    img.src = dataUrl;
    // Only restore sketch once
    localStorage.setItem(SKETCH_KEY + "_restored", "1");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layers.length, draftRestored]);

  // Auto-save form fields (debounced)
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({ title, description, budget, category, color, size, opacity })
        );
        setSavedAt(Date.now());
      } catch {}
    }, 600);
    return () => clearTimeout(t);
  }, [title, description, budget, category, color, size, opacity]);

  // Auto-save sketch (throttled via timer; runs on history changes = after each stroke)
  useEffect(() => {
    if (!displayRef.current) return;
    const t = setTimeout(() => {
      try {
        const url = displayRef.current!.toDataURL("image/png");
        // Limit size to avoid quota issues
        if (url.length < 4_500_000) {
          localStorage.setItem(SKETCH_KEY, url);
          setSavedAt(Date.now());
        }
      } catch {}
    }, 1200);
    return () => clearTimeout(t);
  }, [history]);

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    localStorage.removeItem(SKETCH_KEY);
    setSavedAt(null);
    toast.success("Draft cleared");
  };

  // ===== Pinch-to-zoom & two-finger pan =====
  const onCanvasTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length >= 2) {
      multiTouch.current = true;
      drawing.current = false;
      const [a, b] = [e.touches[0], e.touches[1]];
      const dx = b.clientX - a.clientX;
      const dy = b.clientY - a.clientY;
      pinchRef.current = {
        dist: Math.hypot(dx, dy),
        cx: (a.clientX + b.clientX) / 2,
        cy: (a.clientY + b.clientY) / 2,
        zoom,
        pan: { ...pan },
      };
    }
  };

  const onCanvasTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length >= 2 && pinchRef.current) {
      e.preventDefault();
      const [a, b] = [e.touches[0], e.touches[1]];
      const dx = b.clientX - a.clientX;
      const dy = b.clientY - a.clientY;
      const dist = Math.hypot(dx, dy);
      const cx = (a.clientX + b.clientX) / 2;
      const cy = (a.clientY + b.clientY) / 2;
      const start = pinchRef.current;
      const nextZoom = Math.max(0.5, Math.min(5, (start.zoom * dist) / start.dist));
      const nextPan = {
        x: start.pan.x + (cx - start.cx),
        y: start.pan.y + (cy - start.cy),
      };
      setZoom(nextZoom);
      setPan(nextPan);
    }
  };

  const onCanvasTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      pinchRef.current = null;
      // small delay so the next finger doesn't immediately draw
      setTimeout(() => { multiTouch.current = false; }, 80);
    }
  };

  const resetZoom = () => { setZoom(1); setPan({ x: 0, y: 0 }); };


  const drawLayerWithTransform = (
    ctx: CanvasRenderingContext2D,
    layerCanvas: HTMLCanvasElement,
    t: LayerTransform,
  ) => {
    ctx.save();
    ctx.translate(CANVAS_W / 2 + t.tx, CANVAS_H / 2 + t.ty);
    ctx.rotate((t.rot * Math.PI) / 180);
    ctx.scale(t.scale, t.scale);
    ctx.drawImage(layerCanvas, -CANVAS_W / 2, -CANVAS_H / 2);
    ctx.restore();
  };

  const composite = useCallback(() => {
    const display = displayRef.current;
    if (!display) return;
    const ctx = display.getContext("2d")!;
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    layers.forEach((l) => {
      if (!l.visible) return;
      if (l.pending) {
        drawLayerWithTransform(ctx, l.canvas, l.pending);
      } else {
        ctx.drawImage(l.canvas, 0, 0);
      }
    });
    // Visualize pending bounding box on active layer (rectangle handle hint)
    const act = layers.find((l) => l.id === activeLayerId && l.pending);
    if (act && act.pending) {
      const t = act.pending;
      ctx.save();
      ctx.translate(CANVAS_W / 2 + t.tx, CANVAS_H / 2 + t.ty);
      ctx.rotate((t.rot * Math.PI) / 180);
      ctx.scale(t.scale, t.scale);
      ctx.strokeStyle = "#c9a84c";
      ctx.lineWidth = 2 / Math.max(0.25, t.scale);
      ctx.setLineDash([10 / Math.max(0.25, t.scale), 6 / Math.max(0.25, t.scale)]);
      ctx.strokeRect(-CANVAS_W / 2, -CANVAS_H / 2, CANVAS_W, CANVAS_H);
      ctx.restore();
    }
  }, [layers, bgColor, activeLayerId]);


  useEffect(() => {
    composite();
  }, [composite]);

  const activeLayer = layers.find((l) => l.id === activeLayerId);

  const snapshot = useCallback(() => {
    setHistory((h) => [
      ...h.slice(-49),
      layers.map((l) => l.canvas.getContext("2d")!.getImageData(0, 0, CANVAS_W, CANVAS_H)),
    ]);
    setFuture([]);
  }, [layers]);

  const restoreSnapshot = (snap: ImageData[]) => {
    snap.forEach((data, idx) => {
      const l = layers[idx];
      if (l) l.canvas.getContext("2d")!.putImageData(data, 0, 0);
    });
    composite();
  };

  const undo = () => {
    if (!history.length) return;
    const prev = history[history.length - 1];
    setFuture((f) => [
      layers.map((l) => l.canvas.getContext("2d")!.getImageData(0, 0, CANVAS_W, CANVAS_H)),
      ...f,
    ]);
    setHistory((h) => h.slice(0, -1));
    restoreSnapshot(prev);
  };

  const redo = () => {
    if (!future.length) return;
    const next = future[0];
    setHistory((h) => [
      ...h,
      layers.map((l) => l.canvas.getContext("2d")!.getImageData(0, 0, CANVAS_W, CANVAS_H)),
    ]);
    setFuture((f) => f.slice(1));
    restoreSnapshot(next);
  };

  const getPos = (e: React.PointerEvent) => {
    const r = displayRef.current!.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * CANVAS_W,
      y: ((e.clientY - r.top) / r.height) * CANVAS_H,
    };
  };

  const ctxOfActive = () => activeLayer?.canvas.getContext("2d") ?? null;

  const drawDot = (x: number, y: number, erase = false) => {
    const ctx = ctxOfActive();
    if (!ctx) return;
    ctx.save();
    ctx.globalAlpha = erase ? 1 : opacity / 100;
    ctx.globalCompositeOperation = erase ? "destination-out" : "source-over";
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  const drawLineSeg = (a: { x: number; y: number }, b: { x: number; y: number }, erase = false) => {
    const ctx = ctxOfActive();
    if (!ctx) return;
    ctx.save();
    ctx.globalAlpha = erase ? 1 : opacity / 100;
    ctx.globalCompositeOperation = erase ? "destination-out" : "source-over";
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.restore();
  };


  const drawShapePreview = (start: { x: number; y: number }, end: { x: number; y: number }) => {
    const pv = previewRef.current;
    if (!pv) return;
    const ctx = pv.getContext("2d")!;
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.save();
    ctx.globalAlpha = opacity / 100;
    ctx.strokeStyle = color;
    ctx.lineWidth = size;

    if (tool === "line") {
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    } else if (tool === "rect") {
      ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
    } else if (tool === "ellipse") {
      ctx.beginPath();
      ctx.ellipse(
        (start.x + end.x) / 2,
        (start.y + end.y) / 2,
        Math.abs(end.x - start.x) / 2,
        Math.abs(end.y - start.y) / 2,
        0,
        0,
        Math.PI * 2
      );
      ctx.stroke();
    }
    ctx.restore();
  };


  const commitShape = (start: { x: number; y: number }, end: { x: number; y: number }) => {
    const ctx = ctxOfActive();
    if (!ctx) return;
    ctx.save();
    ctx.globalAlpha = opacity / 100;
    ctx.strokeStyle = color;
    ctx.lineWidth = size;

    if (tool === "line") {
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    } else if (tool === "rect") {
      ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
    } else if (tool === "ellipse") {
      ctx.beginPath();
      ctx.ellipse(
        (start.x + end.x) / 2,
        (start.y + end.y) / 2,
        Math.abs(end.x - start.x) / 2,
        Math.abs(end.y - start.y) / 2,
        0,
        0,
        Math.PI * 2
      );
      ctx.stroke();
    }
    ctx.restore();
    const pv = previewRef.current;
    pv?.getContext("2d")!.clearRect(0, 0, CANVAS_W, CANVAS_H);
  };

  const hexToRgba = (hex: string) => {
    const v = hex.replace("#", "");
    const n = parseInt(
      v.length === 3 ? v.split("").map((c) => c + c).join("") : v,
      16
    );
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255];
  };

  const floodFill = (x: number, y: number) => {
    const ctx = ctxOfActive();
    if (!ctx) return;
    const sx = Math.floor(x);
    const sy = Math.floor(y);
    const img = ctx.getImageData(0, 0, CANVAS_W, CANVAS_H);
    const data = img.data;
    const idx = (sy * CANVAS_W + sx) * 4;
    const target = [data[idx], data[idx + 1], data[idx + 2], data[idx + 3]];
    const fill = hexToRgba(color);
    fill[3] = Math.round((opacity / 100) * 255);
    if (target.every((v, i) => v === fill[i])) return;

    const stack = [[sx, sy]];
    const match = (i: number) =>
      data[i] === target[0] &&
      data[i + 1] === target[1] &&
      data[i + 2] === target[2] &&
      data[i + 3] === target[3];
    while (stack.length) {
      const [cx, cy] = stack.pop()!;
      if (cx < 0 || cy < 0 || cx >= CANVAS_W || cy >= CANVAS_H) continue;
      const i = (cy * CANVAS_W + cx) * 4;
      if (!match(i)) continue;
      data[i] = fill[0];
      data[i + 1] = fill[1];
      data[i + 2] = fill[2];
      data[i + 3] = fill[3];
      stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
    }
    ctx.putImageData(img, 0, 0);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (multiTouch.current) return;
    if (activeLayer?.pending) {
      toast.error("Commit or cancel the imported layer first");
      return;
    }
    if (!activeLayer?.visible) {
      toast.error("Active layer is hidden");
      return;
    }


    snapshot();
    const p = getPos(e);
    drawing.current = true;
    startPt.current = p;
    lastPt.current = p;
    (e.target as Element).setPointerCapture(e.pointerId);

    if (tool === "brush") drawDot(p.x, p.y);
    else if (tool === "eraser") drawDot(p.x, p.y, true);
    else if (tool === "fill") {
      floodFill(p.x, p.y);
      drawing.current = false;
    } else if (tool === "text") {
      const ctx = ctxOfActive();
      if (ctx) {
        ctx.save();
        ctx.globalAlpha = opacity / 100;
        ctx.fillStyle = color;
        ctx.font = `${Math.max(12, size * 4)}px Inter, sans-serif`;

        ctx.textBaseline = "top";
        ctx.fillText(textInput, p.x, p.y);
        ctx.restore();
      }
      drawing.current = false;
    }
    composite();
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const rect = displayRef.current?.getBoundingClientRect();
    if (rect) {
      setCursorTip({ x: e.clientX - rect.left, y: e.clientY - rect.top, show: true });
    }
    if (!drawing.current) return;
    const p = getPos(e);
    if (tool === "brush" || tool === "eraser") {
      if (lastPt.current) drawLineSeg(lastPt.current, p, tool === "eraser");
      lastPt.current = p;
      composite();
    } else if (tool === "line" || tool === "rect" || tool === "ellipse") {
      if (startPt.current) drawShapePreview(startPt.current, p);
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const p = getPos(e);
    if ((tool === "line" || tool === "rect" || tool === "ellipse") && startPt.current) {
      commitShape(startPt.current, p);
      composite();
    }
    drawing.current = false;
    startPt.current = null;
    lastPt.current = null;
  };

  const addLayer = () => {
    const id = crypto.randomUUID();
    setLayers((ls) => [...ls, { id, name: `Layer ${ls.length + 1}`, visible: true, canvas: newCanvas() }]);
    setActiveLayerId(id);
  };

  const removeLayer = (id: string) => {
    if (layers.length === 1) {
      toast.error("Need at least one layer");
      return;
    }
    setLayers((ls) => ls.filter((l) => l.id !== id));
    if (activeLayerId === id) setActiveLayerId(layers.find((l) => l.id !== id)!.id);
  };

  const toggleLayer = (id: string) => {
    setLayers((ls) => ls.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)));
  };

  const clearActive = () => {
    snapshot();
    const ctx = ctxOfActive();
    ctx?.clearRect(0, 0, CANVAS_W, CANVAS_H);
    composite();
  };

  const exportPng = () => {
    const display = displayRef.current!;
    const link = document.createElement("a");
    link.download = `artwork-${Date.now()}.png`;
    link.href = display.toDataURL("image/png");
    link.click();
    toast.success("Artwork exported");
  };

  // ===== Import & stylize artwork =====
  const openImport = () => {
    setRestylizeLayerId(null);
    setImportSrc(null);
    importImgRef.current = null;
    setImportOpen(true);
  };

  const openRestylize = async (layerId: string) => {
    const l = layers.find((x) => x.id === layerId);
    if (!l || !l.imported) return;
    setRestylizeLayerId(layerId);
    setImportStyle(l.imported.style);
    setImportPalette(l.imported.palette);
    setImportIntensity(l.imported.intensity);
    setImportSrc(l.imported.srcDataUrl);
    try {
      importImgRef.current = await loadImage(l.imported.srcDataUrl);
    } catch {
      toast.error("Could not load original image");
    }
    setImportOpen(true);
  };

  const fileToDataUrl = (f: File) =>
    new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(f);
    });

  const validImage = (f: File) => {
    if (!f.type.startsWith("image/")) {
      toast.error(`${f.name} is not an image`);
      return false;
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.error(`${f.name} exceeds 10MB`);
      return false;
    }
    return true;
  };

  // Stylize a single image and add it as a new pending (movable) layer
  const addStylizedLayer = async (
    img: HTMLImageElement,
    srcDataUrl: string,
    style: StyleId,
    palette: PaletteId,
    intensity: number,
    label?: string,
  ) => {
    const result = await stylizeImage(img, CANVAS_W, CANVAS_H, {
      style, palette, intensity, customColor: color,
    });
    snapshot();
    const id = crypto.randomUUID();
    const lc = newCanvas();
    lc.getContext("2d")!.drawImage(result, 0, 0);
    setLayers((ls) => [
      ...ls,
      {
        id,
        name: label ?? `Imported · ${style}`,
        visible: true,
        canvas: lc,
        imported: { srcDataUrl, style, palette, intensity, customColor: color },
        pending: { ...IDENTITY_TRANSFORM },
      },
    ]);
    setActiveLayerId(id);
    return id;
  };

  // Quick import (no dialog) — used for drag-drop & multi-file batches
  const quickImportFiles = async (files: File[]) => {
    const list = files.filter(validImage);
    if (!list.length) return;
    setImportBusy(true);
    try {
      for (const f of list) {
        try {
          const url = await fileToDataUrl(f);
          const img = await loadImage(url);
          await addStylizedLayer(img, url, importStyle, importPalette, importIntensity, f.name.slice(0, 28));
        } catch (err) {
          console.error(err);
          toast.error(`Failed to import ${f.name}`);
        }
      }
      toast.success(`Added ${list.length} layer${list.length > 1 ? "s" : ""} — move/scale/rotate then Commit`);
    } finally {
      setImportBusy(false);
    }
  };

  const onImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    e.target.value = "";
    // If multiple, batch-import directly without dialog preview
    if (files.length > 1) {
      setImportOpen(false);
      await quickImportFiles(files);
      return;
    }
    const f = files[0];
    if (!validImage(f)) return;
    const url = await fileToDataUrl(f);
    setImportSrc(url);
    try {
      importImgRef.current = await loadImage(url);
    } catch {
      toast.error("Could not load image");
    }
  };

  // Live preview of stylization
  useEffect(() => {
    if (!importOpen || !importImgRef.current || !importPreviewRef.current) return;
    let cancelled = false;
    const handle = setTimeout(async () => {
      try {
        setImportBusy(true);
        const previewW = 480;
        const previewH = Math.round((previewW * CANVAS_H) / CANVAS_W);
        const result = await stylizeImage(importImgRef.current!, previewW, previewH, {
          style: importStyle,
          palette: importPalette,
          intensity: importIntensity,
          customColor: color,
        });
        if (cancelled) return;
        const pv = importPreviewRef.current!;
        pv.width = previewW;
        pv.height = previewH;
        pv.getContext("2d")!.drawImage(result, 0, 0);
      } finally {
        if (!cancelled) setImportBusy(false);
      }
    }, 80);
    return () => { cancelled = true; clearTimeout(handle); };
  }, [importOpen, importSrc, importStyle, importPalette, importIntensity, color]);

  const applyImport = async () => {
    if (!importImgRef.current || !importSrc) {
      toast.error("Choose an image first");
      return;
    }
    try {
      setImportBusy(true);
      // Restylize existing layer in-place
      if (restylizeLayerId) {
        const result = await stylizeImage(importImgRef.current, CANVAS_W, CANVAS_H, {
          style: importStyle, palette: importPalette, intensity: importIntensity, customColor: color,
        });
        snapshot();
        setLayers((ls) =>
          ls.map((l) => {
            if (l.id !== restylizeLayerId) return l;
            const c = newCanvas();
            c.getContext("2d")!.drawImage(result, 0, 0);
            return {
              ...l,
              canvas: c,
              name: `Imported · ${importStyle}`,
              imported: { srcDataUrl: l.imported?.srcDataUrl ?? importSrc, style: importStyle, palette: importPalette, intensity: importIntensity, customColor: color },
            };
          })
        );
        setImportOpen(false);
        setRestylizeLayerId(null);
        toast.success("Layer restylized");
        return;
      }
      // New import — add as pending (movable) layer
      await addStylizedLayer(importImgRef.current, importSrc, importStyle, importPalette, importIntensity);
      setImportOpen(false);
      toast.success("Added — drag, scale or rotate, then Commit");
    } catch (err) {
      console.error(err);
      toast.error("Failed to stylize image");
    } finally {
      setImportBusy(false);
    }
  };

  // ===== Pending layer transform controls =====
  const updatePending = (patch: Partial<LayerTransform>) => {
    setLayers((ls) =>
      ls.map((l) =>
        l.id === activeLayerId && l.pending ? { ...l, pending: { ...l.pending, ...patch } } : l,
      ),
    );
  };

  const commitPending = () => {
    const l = layers.find((x) => x.id === activeLayerId);
    if (!l || !l.pending) return;
    const baked = newCanvas();
    const bctx = baked.getContext("2d")!;
    drawLayerWithTransform(bctx, l.canvas, l.pending);
    snapshot();
    setLayers((ls) => ls.map((x) => (x.id === l.id ? { ...x, canvas: baked, pending: undefined } : x)));
    toast.success("Layer committed");
  };

  const cancelPending = () => {
    const l = layers.find((x) => x.id === activeLayerId);
    if (!l || !l.pending) return;
    // remove the pending (un-committed) layer entirely
    setLayers((ls) => ls.filter((x) => x.id !== l.id));
    if (layers.length > 1) {
      const next = layers.find((x) => x.id !== l.id);
      if (next) setActiveLayerId(next.id);
    }
  };

  // ===== Drag-and-drop on canvas =====
  const onCanvasDragOver = (e: React.DragEvent) => {
    if (Array.from(e.dataTransfer.types).includes("Files")) {
      e.preventDefault();
      setDragOver(true);
    }
  };
  const onCanvasDragLeave = () => setDragOver(false);
  const onCanvasDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (!files.length) return;
    await quickImportFiles(files);
  };

  // ===== Background AI suggest =====
  const suggestBackground = async () => {
    setBgSuggesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("suggest-background", {
        body: { category, description, style: importStyle },
      });
      if (error) throw error;
      if (data?.color) {
        setBgColor(data.color);
        setBgSuggestion({ color: data.color, name: data.name, reason: data.reason });
        toast.success(`Suggested: ${data.name}`);
      }
    } catch (err: any) {
      toast.error("Couldn't reach the background assistant");
    } finally {
      setBgSuggesting(false);
    }
  };





  const handleRefFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const valid = files.filter((f) => {
      if (!f.type.startsWith("image/")) {
        toast.error(`${f.name} is not an image`);
        return false;
      }
      if (f.size > 10 * 1024 * 1024) {
        toast.error(`${f.name} exceeds 10MB`);
        return false;
      }
      return true;
    });
    const combined = [...refFiles, ...valid].slice(0, 6);
    setRefFiles(combined);
    setRefPreviews(combined.map((f) => URL.createObjectURL(f)));
    e.target.value = "";
  };

  const removeRef = (idx: number) => {
    const next = refFiles.filter((_, i) => i !== idx);
    setRefFiles(next);
    setRefPreviews(next.map((f) => URL.createObjectURL(f)));
  };

  const dataUrlToBlob = (dataUrl: string) => {
    const [meta, b64] = dataUrl.split(",");
    const mime = meta.match(/:(.*?);/)?.[1] ?? "image/png";
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  };

  const submitRequest = async () => {
    if (!user) {
      toast.error("Please sign in to submit a request");
      navigate("/auth");
      return;
    }
    if (!category) return toast.error("Pick a category first");
    if (!title.trim()) return toast.error("Add a title for your request");
    if (refFiles.length === 0 && !displayRef.current) {
      return toast.error("Upload a reference image or draw a sketch");
    }

    setSubmitting(true);
    setUploading(true);
    try {
      const uploadedPaths: string[] = [];
      for (const f of refFiles) {
        const ext = f.name.split(".").pop() || "png";
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error } = await supabase.storage.from("artwork-requests").upload(path, f);
        if (error) throw error;
        uploadedPaths.push(path);
      }

      // Upload sketch if there's anything drawn
      let sketchPath: string | null = null;
      const display = displayRef.current;
      if (display) {
        const blob = dataUrlToBlob(display.toDataURL("image/png"));
        const path = `${user.id}/sketch-${Date.now()}.png`;
        const { error } = await supabase.storage
          .from("artwork-requests")
          .upload(path, blob, { contentType: "image/png" });
        if (!error) sketchPath = path;
      }
      setUploading(false);

      const { error: insertError } = await supabase.from("artwork_requests").insert({
        user_id: user.id,
        category,
        title: title.trim(),
        description: description.trim() || null,
        budget: budget ? Number(budget) : null,
        reference_image_urls: uploadedPaths,
        sketch_url: sketchPath,
      });
      if (insertError) throw insertError;

      toast.success("Request submitted! Artists will be in touch.");
      setTitle("");
      setDescription("");
      setBudget("");
      setRefFiles([]);
      setRefPreviews([]);
      localStorage.removeItem(DRAFT_KEY);
      localStorage.removeItem(SKETCH_KEY);
      setSavedAt(null);

    } catch (err: any) {
      toast.error(err.message || "Failed to submit request");
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  const allTools: { id: Tool; icon: any; label: string; description: string }[] = [
    { id: "brush", icon: Brush, label: "Brush", description: "Freehand painting and drawing" },
    { id: "eraser", icon: Eraser, label: "Eraser", description: "Remove strokes from the canvas" },
    { id: "line", icon: Minus, label: "Line", description: "Draw a straight line" },
    { id: "rect", icon: Square, label: "Rectangle", description: "Draw rectangles and squares" },
    { id: "ellipse", icon: CircleIcon, label: "Ellipse", description: "Draw circles and ovals" },
    { id: "fill", icon: PaintBucket, label: "Fill", description: "Flood-fill an enclosed area" },
    { id: "text", icon: TypeIcon, label: "Text", description: "Click canvas to place text" },
  ];
  const activeCat = CATEGORIES.find((c) => c.label === category);
  const tools = activeCat ? allTools.filter((t) => activeCat.tools.includes(t.id)) : allTools;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-12">
        <div className="container max-w-7xl">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground">Request an Artwork</h1>
              <p className="mt-1 text-muted-foreground">
                Choose a category, then sketch your idea on the canvas below.
              </p>
            </div>
            <Button variant="outline" onClick={() => navigate("/my-requests")}>View My Requests</Button>
          </div>

          {/* Category selector */}
          <div className="mt-6 flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.label}
                onClick={() => {
                  setCategory(c.label);
                  if (!c.tools.includes(tool)) setTool(c.tools[0]);
                }}
                className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                  category === c.label
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-foreground hover:bg-secondary"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {category && (
            <>
              {/* Toolbar — appears ABOVE canvas when category chosen */}
              <div className="mt-6 rounded-xl border border-primary/30 bg-card p-4 shadow-gold">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {tools.map((t) => (
                      <Tooltip key={t.id}>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant={tool === t.id ? "default" : "outline"}
                            onClick={() => setTool(t.id)}
                            className={
                              tool === t.id
                                ? "bg-gradient-gold text-primary-foreground ring-2 ring-primary ring-offset-1 ring-offset-background scale-105 shadow-gold"
                                : ""
                            }
                          >
                            <t.icon className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <p className="font-medium">{t.label}</p>
                          <p className="text-xs text-muted-foreground">{t.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>

                  <div className="h-8 w-px bg-border" />

                  <div className="flex items-center gap-2">
                    <Label htmlFor="clr" className="text-xs text-muted-foreground">Color</Label>
                    <input
                      id="clr"
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="h-8 w-10 cursor-pointer rounded border border-border bg-transparent"
                    />
                    <div className="flex flex-wrap items-center gap-1">
                      {SWATCHES.map((sw) => (
                        <button
                          key={sw}
                          type="button"
                          onClick={() => setColor(sw)}
                          aria-label={`Set color ${sw}`}
                          title={sw}
                          className={`h-6 w-6 rounded-md border transition-transform hover:scale-110 ${
                            color.toLowerCase() === sw.toLowerCase()
                              ? "border-primary ring-2 ring-primary ring-offset-1 ring-offset-background scale-110"
                              : "border-border"
                          }`}
                          style={{ backgroundColor: sw }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 min-w-[160px]">
                    <Label className="text-xs text-muted-foreground">Size</Label>
                    <Slider
                      value={[size]}
                      onValueChange={(v) => setSize(v[0])}
                      min={1}
                      max={60}
                      step={1}
                      className="w-28"
                    />
                    <span className="w-6 text-xs text-foreground">{size}</span>
                  </div>

                  <div className="flex items-center gap-2 min-w-[160px]">
                    <Label className="text-xs text-muted-foreground">Opacity</Label>
                    <Slider
                      value={[opacity]}
                      onValueChange={(v) => setOpacity(v[0])}
                      min={5}
                      max={100}
                      step={1}
                      className="w-24"
                    />
                    <span className="w-8 text-xs text-foreground">{opacity}%</span>
                  </div>


                  {tool === "text" && (
                    <Input
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      placeholder="Type then click on canvas"
                      className="h-8 w-48"
                    />
                  )}

                  <div className="h-8 w-px bg-border" />

                  <Button size="sm" variant="outline" onClick={undo} disabled={!history.length}>
                    <Undo2 className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={redo} disabled={!future.length}>
                    <Redo2 className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={clearActive}>
                    <Trash2 className="h-4 w-4 mr-1" /> Clear Layer
                  </Button>

                  <div className="h-8 w-px bg-border" />

                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="outline" onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))}>−</Button>
                    <button
                      type="button"
                      onClick={resetZoom}
                      className="min-w-[52px] rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground hover:bg-secondary"
                      title="Reset zoom"
                    >
                      {Math.round(zoom * 100)}%
                    </button>
                    <Button size="sm" variant="outline" onClick={() => setZoom((z) => Math.min(5, +(z + 0.25).toFixed(2)))}>+</Button>
                  </div>

                  <div className="ml-auto flex items-center gap-2">
                    {savedAt && (
                      <span className="hidden sm:inline text-xs text-muted-foreground">
                        Draft saved {new Date(savedAt).toLocaleTimeString()}
                      </span>
                    )}
                    <Button size="sm" variant="outline" onClick={openImport} title="Import artwork and convert to a drawn style">
                      <ImagePlus className="h-4 w-4 mr-1" /> Import Artwork
                    </Button>
                    <Button size="sm" variant="outline" onClick={clearDraft} title="Clear saved draft">
                      Clear Draft
                    </Button>
                    <Button size="sm" onClick={exportPng} className="bg-gradient-gold text-primary-foreground">
                      <Download className="h-4 w-4 mr-1" /> Export PNG
                    </Button>
                  </div>

                </div>
              </div>

              {/* Background controls */}
              <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3">
                <span className="text-xs font-medium text-muted-foreground mr-1">Background:</span>
                {BG_PRESETS.map((b) => (
                  <button
                    key={b.color}
                    type="button"
                    onClick={() => setBgColor(b.color)}
                    title={b.name}
                    className={`h-7 w-7 rounded-md border transition-transform hover:scale-110 ${
                      bgColor.toLowerCase() === b.color.toLowerCase()
                        ? "border-primary ring-2 ring-primary ring-offset-1 ring-offset-background scale-110"
                        : "border-border"
                    }`}
                    style={{ backgroundColor: b.color }}
                  />
                ))}
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="h-7 w-9 cursor-pointer rounded border border-border bg-transparent"
                  title="Custom background color"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={suggestBackground}
                  disabled={bgSuggesting}
                  title="Let the assistant suggest a background based on your request"
                >
                  <Wand2 className="h-4 w-4 mr-1" />
                  {bgSuggesting ? "Thinking…" : "Suggest"}
                </Button>
                {bgSuggestion && (
                  <span className="text-xs text-muted-foreground">
                    <span className="text-foreground font-medium">{bgSuggestion.name}</span> — {bgSuggestion.reason}
                  </span>
                )}
              </div>

              {/* Transform panel — visible when active layer is pending */}
              {activeLayer?.pending && (
                <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-primary/40 bg-primary/5 p-3">
                  <div className="flex items-center gap-2 text-xs font-medium text-primary">
                    <Move className="h-4 w-4" /> Position imported layer
                  </div>
                  <div className="flex items-center gap-2 min-w-[180px]">
                    <Label className="text-xs text-muted-foreground w-6">X</Label>
                    <Slider value={[activeLayer.pending.tx]} min={-CANVAS_W / 2} max={CANVAS_W / 2} step={1}
                      onValueChange={(v) => updatePending({ tx: v[0] })} className="w-32" />
                  </div>
                  <div className="flex items-center gap-2 min-w-[180px]">
                    <Label className="text-xs text-muted-foreground w-6">Y</Label>
                    <Slider value={[activeLayer.pending.ty]} min={-CANVAS_H / 2} max={CANVAS_H / 2} step={1}
                      onValueChange={(v) => updatePending({ ty: v[0] })} className="w-32" />
                  </div>
                  <div className="flex items-center gap-2 min-w-[180px]">
                    <Label className="text-xs text-muted-foreground">Scale</Label>
                    <Slider value={[activeLayer.pending.scale * 100]} min={10} max={300} step={1}
                      onValueChange={(v) => updatePending({ scale: v[0] / 100 })} className="w-28" />
                    <span className="w-10 text-xs">{Math.round(activeLayer.pending.scale * 100)}%</span>
                  </div>
                  <div className="flex items-center gap-2 min-w-[180px]">
                    <Label className="text-xs text-muted-foreground"><RotateCw className="h-3 w-3 inline" /></Label>
                    <Slider value={[activeLayer.pending.rot]} min={-180} max={180} step={1}
                      onValueChange={(v) => updatePending({ rot: v[0] })} className="w-28" />
                    <span className="w-10 text-xs">{Math.round(activeLayer.pending.rot)}°</span>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => updatePending({ ...IDENTITY_TRANSFORM })}>Reset</Button>
                  <Button size="sm" variant="outline" onClick={cancelPending}>Cancel</Button>
                  <Button size="sm" onClick={commitPending} className="bg-gradient-gold text-primary-foreground">
                    <Check className="h-4 w-4 mr-1" /> Commit
                  </Button>
                </div>
              )}

              {/* Canvas + Layers */}
              <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_240px]">
                {/* White task pane / canvas */}
                <div className="overflow-hidden rounded-xl border border-border shadow-lg" style={{ backgroundColor: bgColor }}>
                  <div
                    className="relative w-full overflow-hidden touch-none"
                    style={{ aspectRatio: `${CANVAS_W} / ${CANVAS_H}` }}
                    onTouchStart={onCanvasTouchStart}
                    onTouchMove={onCanvasTouchMove}
                    onTouchEnd={onCanvasTouchEnd}
                    onTouchCancel={onCanvasTouchEnd}
                    onDragOver={onCanvasDragOver}
                    onDragLeave={onCanvasDragLeave}
                    onDrop={onCanvasDrop}
                  >
                    <div
                      className="absolute inset-0"
                      style={{
                        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                        transformOrigin: "0 0",
                        transition: pinchRef.current ? "none" : "transform 80ms ease-out",
                      }}
                    >
                      <canvas
                        ref={displayRef}
                        width={CANVAS_W}
                        height={CANVAS_H}
                        className="absolute inset-0 h-full w-full touch-none"
                        style={{
                          cursor:
                            activeLayer?.pending
                              ? "move"
                              : tool === "text"
                              ? "text"
                              : tool === "fill"
                              ? "pointer"
                              : "crosshair",
                        }}
                        onPointerDown={onPointerDown}
                        onPointerMove={onPointerMove}
                        onPointerUp={onPointerUp}
                        onPointerCancel={onPointerUp}
                        onPointerLeave={() => setCursorTip((prev) => ({ ...prev, show: false }))}
                      />
                      <canvas
                        ref={previewRef}
                        width={CANVAS_W}
                        height={CANVAS_H}
                        className="pointer-events-none absolute inset-0 h-full w-full"
                      />
                    </div>

                    {/* Touch-device active-tool badge */}
                    {isTouchDevice && (
                      <div className="pointer-events-none absolute left-2 top-2 flex items-center gap-1.5 rounded-lg border border-primary/40 bg-background/90 px-2.5 py-1.5 shadow-gold backdrop-blur-sm">
                        {(() => {
                          const t = allTools.find((x) => x.id === tool);
                          if (!t) return null;
                          const Icon = t.icon;
                          return (
                            <>
                              <Icon className="h-4 w-4 text-primary" />
                              <span className="text-xs font-medium text-foreground">{t.label}</span>
                            </>
                          );
                        })()}
                      </div>
                    )}
                    {/* Cursor-following tooltip on canvas */}
                    {cursorTip.show && !isTouchDevice && !activeLayer?.pending && (
                      <div
                        className="pointer-events-none absolute z-10 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md"
                        style={{
                          left: cursorTip.x + 16,
                          top: cursorTip.y + 16,
                        }}
                      >
                        {allTools.find((x) => x.id === tool)?.description}
                      </div>
                    )}

                    {/* Drag-drop overlay */}
                    {dragOver && (
                      <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-primary/10 backdrop-blur-sm border-4 border-dashed border-primary rounded-xl">
                        <div className="rounded-lg bg-background/95 px-4 py-3 text-center shadow-gold">
                          <ImagePlus className="mx-auto h-6 w-6 text-primary" />
                          <p className="mt-1 text-sm font-medium text-foreground">Drop image(s) to import as new layers</p>
                          <p className="text-xs text-muted-foreground">Each image will be stylized with the current settings</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Layers panel */}
                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <LayersIcon className="h-4 w-4 text-primary" />
                      <span className="font-medium text-foreground text-sm">Layers</span>
                    </div>
                    <Button size="sm" variant="outline" onClick={addLayer}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="mt-3 space-y-1.5">
                    {[...layers].reverse().map((l) => (
                      <div
                        key={l.id}
                        onClick={() => setActiveLayerId(l.id)}
                        className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 cursor-pointer text-sm ${
                          activeLayerId === l.id
                            ? "border-primary bg-primary/10"
                            : "border-border bg-background hover:bg-secondary"
                        }`}
                      >
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleLayer(l.id); }}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          {l.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </button>
                        <span className="flex-1 truncate text-foreground">
                          {l.name}
                          {l.pending && <span className="ml-1 text-[10px] text-primary">• pending</span>}
                        </span>
                        {l.imported && !l.pending && (
                          <button
                            onClick={(e) => { e.stopPropagation(); openRestylize(l.id); }}
                            title="Restylize this imported layer"
                            className="text-muted-foreground hover:text-primary"
                          >
                            <Sparkles className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); removeLayer(l.id); }}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-[11px] text-muted-foreground">
                    Drag images onto the canvas to import them as new layers.
                  </p>
                </div>
              </div>


              {/* Upload reference artwork + submit request */}
              <div className="mt-6 rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-2">
                  <Upload className="h-5 w-5 text-primary" />
                  <h2 className="font-display text-lg font-semibold text-foreground">
                    Upload your artwork to be done for you
                  </h2>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Attach reference images, describe what you want, and submit. Our artists will reach out to take on your commission.
                </p>

                {/* Image uploader */}
                <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-background px-4 py-8 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:bg-secondary">
                    <ImagePlus className="h-5 w-5" />
                    Click to upload reference images (max 6, 10MB each)
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleRefFiles}
                      className="hidden"
                    />
                  </label>
                </div>

                {refPreviews.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
                    {refPreviews.map((src, i) => (
                      <div key={i} className="relative aspect-square overflow-hidden rounded-lg border border-border">
                        <img src={src} alt={`Reference ${i + 1}`} className="h-full w-full object-cover" />
                        <button
                          onClick={() => removeRef(i)}
                          className="absolute right-1 top-1 rounded-full bg-background/90 p-1 text-foreground hover:bg-destructive hover:text-destructive-foreground"
                          type="button"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Request details */}
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label htmlFor="req-title" className="text-foreground">Title *</Label>
                    <Input
                      id="req-title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value.slice(0, 120))}
                      placeholder="e.g. Portrait of my grandmother"
                      className="mt-1 bg-background border-border"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="req-desc" className="text-foreground">Description</Label>
                    <Textarea
                      id="req-desc"
                      value={description}
                      onChange={(e) => setDescription(e.target.value.slice(0, 1000))}
                      placeholder="Size, style, colors, deadline, anything else important..."
                      rows={4}
                      className="mt-1 bg-background border-border"
                    />
                  </div>
                  <div>
                    <Label htmlFor="req-budget" className="text-foreground">Budget (GHS)</Label>
                    <Input
                      id="req-budget"
                      type="number"
                      min={0}
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                      placeholder="e.g. 500"
                      className="mt-1 bg-background border-border"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={submitRequest}
                      disabled={submitting}
                      className="w-full bg-gradient-gold text-primary-foreground shadow-gold hover:opacity-90"
                    >
                      <Send className="mr-2 h-4 w-4" />
                      {uploading ? "Uploading..." : submitting ? "Submitting..." : "Submit Request"}
                    </Button>
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Your sketch from the canvas above will be included automatically.
                </p>
              </div>
            </>
          )}

          {!category && (
            <div className="mt-10 rounded-xl border border-dashed border-border bg-card p-12 text-center">
              <p className="text-muted-foreground">
                Select a category above to open the drawing canvas and tools.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Import & Stylize artwork dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{restylizeLayerId ? "Restylize imported layer" : "Import artwork as a drawing"}</DialogTitle>
            <DialogDescription>
              {restylizeLayerId
                ? "Change the style, palette or intensity — the layer will be redrawn from the original image."
                : "Upload one or more images and we'll redraw them on the canvas. Multiple files import as separate layers."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-[1fr_220px]">
            {/* Preview */}
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <Label className="text-xs text-muted-foreground">Preview</Label>
              <div className="mt-2 flex aspect-[5/3] items-center justify-center overflow-hidden rounded-md bg-white">
                {importSrc ? (
                  <canvas ref={importPreviewRef} className="h-full w-full object-contain" />
                ) : (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    <ImagePlus className="mx-auto mb-2 h-8 w-8 opacity-50" />
                    Choose image(s) to begin — or drop them on the canvas
                  </div>
                )}
              </div>
              {!restylizeLayerId && (
                <div className="mt-3">
                  <Input type="file" accept="image/*" multiple onChange={onImportFile} />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Tip: selecting multiple files imports them straight to the canvas as separate layers.
                  </p>
                </div>
              )}
            </div>


            {/* Controls */}
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Drawing style</Label>
                <div className="mt-1 grid grid-cols-2 gap-1.5">
                  {STYLES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setImportStyle(s.id)}
                      title={s.description}
                      className={`rounded-md border px-2 py-1.5 text-xs transition-colors ${
                        importStyle === s.id
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background hover:bg-secondary"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Color palette</Label>
                <div className="mt-1 space-y-1">
                  {PALETTE_OPTIONS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setImportPalette(p.id)}
                      className={`flex w-full items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-xs transition-colors ${
                        importPalette === p.id
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background hover:bg-secondary"
                      }`}
                    >
                      <span>{p.label}</span>
                      <span className="flex gap-1">
                        {p.swatch.map((c) => (
                          <span key={c} className="h-4 w-4 rounded border border-border" style={{ backgroundColor: c }} />
                        ))}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Intensity</Label>
                  <span className="text-xs text-foreground">{importIntensity}%</span>
                </div>
                <Slider
                  value={[importIntensity]}
                  onValueChange={(v) => setImportIntensity(v[0])}
                  min={10}
                  max={100}
                  step={1}
                  className="mt-2"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)} disabled={importBusy}>
              Cancel
            </Button>
            <Button
              onClick={applyImport}
              disabled={!importSrc || importBusy}
              className="bg-gradient-gold text-primary-foreground"
            >
              {importBusy ? "Working…" : restylizeLayerId ? "Apply new style" : "Add to canvas"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default RequestArtwork;
