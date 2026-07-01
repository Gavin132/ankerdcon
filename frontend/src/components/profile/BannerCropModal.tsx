import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, ZoomIn, ZoomOut, Upload } from "lucide-react";
import { Button } from "../common/Button";

const ASPECT  = 3;     // 3:1 banner ratio
const OUT_W   = 1200;  // canvas output width
const OUT_H   = 400;   // canvas output height
const MAX_ZOOM = 4;

interface Props {
  open: boolean;
  file: File | null;
  onClose: () => void;
  /** Called with the cropped Blob, whether it's an animated GIF, and the CSS background-position (GIF only) */
  onConfirm: (blob: Blob, isGif: boolean, position?: string) => void;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

export function BannerCropModal({ open, file, onClose, onConfirm }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Container width measured via ResizeObserver
  const [cw, setCw] = useState(0);

  // Natural image dimensions
  const [nat, setNat] = useState({ w: 0, h: 0 });

  // Crop state
  const [zoom, setZoom]       = useState(1);
  const [pos, setPos]         = useState({ x: 0, y: 0 });
  const [imgReady, setImgReady] = useState(false);
  const [saving, setSaving]   = useState(false);

  const objUrl = useRef<string | null>(null);
  const isGif  = file?.type === "image/gif";

  // ── Object URL lifecycle ────────────────────────────────────────────────────
  useEffect(() => {
    if (!file || !open) return;
    const url = URL.createObjectURL(file);
    objUrl.current = url;
    setNat({ w: 0, h: 0 });
    setZoom(1);
    zoomRef.current = 1;
    setPos({ x: 0, y: 0 });
    setImgReady(false);
    setSaving(false);
    return () => {
      URL.revokeObjectURL(url);
      objUrl.current = null;
    };
  }, [file, open]);

  // ── Measure container ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    // slight delay so the modal has painted
    const raf = requestAnimationFrame(() => {
      if (!containerRef.current) return;
      const ro = new ResizeObserver(([e]) => setCw(e.contentRect.width));
      ro.observe(containerRef.current);
      return () => ro.disconnect();
    });
    return () => cancelAnimationFrame(raf);
  }, [open]);

  function handleImgLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    setNat({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight });
    setImgReady(true);
  }

  // ── Layout maths ─────────────────────────────────────────────────────────────
  // Container height derived from width + aspect ratio
  const ch = cw / ASPECT;

  // Scale so the image covers the container at zoom = 1
  const baseScale = nat.w > 0 && cw > 0
    ? Math.max(cw / nat.w, ch / nat.h)
    : 1;

  // Rendered dimensions at current zoom
  const effW = nat.w * baseScale * zoom;
  const effH = nat.h * baseScale * zoom;

  // Max drag offset so the image always covers the container
  const maxPx = Math.max(0, (effW - cw) / 2);
  const maxPy = Math.max(0, (effH - ch) / 2);
  const cx = clamp(pos.x, -maxPx, maxPx);
  const cy = clamp(pos.y, -maxPy, maxPy);

  // Top-left corner of the image in container space
  const imgLeft = cw / 2 - effW / 2 + cx;
  const imgTop  = ch / 2 - effH / 2 + cy;

  // Track zoom in a ref so applyZoom always sees the latest value even during
  // rapid slider events (zoom state is stale across multiple calls in one frame)
  const zoomRef = useRef(zoom);

  // ── Drag ────────────────────────────────────────────────────────────────────
  const dragging = useRef(false);
  const last     = useRef({ x: 0, y: 0 });

  function pDown(e: React.PointerEvent) {
    dragging.current = true;
    last.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function pMove(e: React.PointerEvent) {
    if (!dragging.current) return;
    const dx = e.clientX - last.current.x;
    const dy = e.clientY - last.current.y;
    last.current = { x: e.clientX, y: e.clientY };
    setPos(p => ({ x: p.x + dx, y: p.y + dy }));
  }
  function pUp() { dragging.current = false; }

  // ── Wheel zoom (desktop) ────────────────────────────────────────────────────
  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    applyZoom(clamp(zoom - e.deltaY * 0.002, 1, MAX_ZOOM));
  }

  function applyZoom(newZ: number) {
    const prevZ = zoomRef.current;
    zoomRef.current = newZ;
    // Keep the visual center fixed while zooming
    setPos(p => ({ x: p.x * newZ / prevZ, y: p.y * newZ / prevZ }));
    setZoom(newZ);
  }

  // ── Canvas crop & confirm ───────────────────────────────────────────────────
  async function handleConfirm() {
    if (!file || !objUrl.current) return;
    setSaving(true);
    try {
      if (isGif) {
        // Canvas cannot export animated GIFs — upload the original file and pass the drag position
        const bgX = maxPx > 0 ? 50 - (cx / maxPx) * 50 : 50;
        const bgY = maxPy > 0 ? 50 - (cy / maxPy) * 50 : 50;
        const position = `${Math.round(bgX)}% ${Math.round(bgY)}%`;
        onConfirm(file, true, position);
        return;
      }

      const img = new Image();
      img.src = objUrl.current;
      await new Promise<void>(resolve => { img.onload = () => resolve(); });

      // Map container crop area → natural image pixels
      const scale = nat.w / effW;          // natural px per rendered px
      const cropX = -imgLeft * scale;
      const cropY = -imgTop  * scale;
      const cropW = cw * scale;
      const cropH = ch * scale;

      const canvas = document.createElement("canvas");
      canvas.width  = OUT_W;
      canvas.height = OUT_H;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(
        img,
        Math.max(0, cropX), Math.max(0, cropY),
        Math.min(img.naturalWidth  - Math.max(0, cropX), cropW),
        Math.min(img.naturalHeight - Math.max(0, cropY), cropH),
        0, 0, OUT_W, OUT_H,
      );

      canvas.toBlob(blob => {
        if (blob) onConfirm(blob, false);
        setSaving(false);
      }, "image/jpeg", 0.92);
    } catch {
      setSaving(false);
    }
  }

  if (typeof window === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && file && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
          />

          {/* Panel — slides up from bottom */}
          <motion.div
            className="fixed z-[201] rounded-2xl bg-white dark:bg-slate-900 shadow-2xl overflow-hidden"
            style={{
              bottom: "max(1rem, env(safe-area-inset-bottom, 1rem))",
              left: "50%",
              width: "min(calc(100vw - 2rem), 560px)",
              x: "-50%",
            }}
            initial={{ y: 56, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 56, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 360 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <p className="text-sm font-black text-slate-900 dark:text-white">
                  Banner bijsnijden
                </p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  {isGif
                    ? "GIF wordt geüpload zoals-is — sleep om de positie te bekijken"
                    : "Sleep · scroll of schuif om in te zoomen"}
                </p>
              </div>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            {/* Crop viewport */}
            <div className="p-4 pb-3">
              <div
                ref={containerRef}
                className="relative overflow-hidden rounded-xl bg-slate-800 select-none touch-none"
                style={{
                  aspectRatio: `${ASPECT} / 1`,
                  cursor: dragging.current ? "grabbing" : "grab",
                }}
                onPointerDown={pDown}
                onPointerMove={pMove}
                onPointerUp={pUp}
                onPointerLeave={pUp}
                onWheel={onWheel}
              >
                {/* Image */}
                {objUrl.current && cw > 0 && (
                  <img
                    src={objUrl.current}
                    onLoad={handleImgLoad}
                    draggable={false}
                    className="absolute pointer-events-none"
                    style={{
                      width:  Math.round(effW),
                      height: Math.round(effH),
                      left:   Math.round(imgLeft),
                      top:    Math.round(imgTop),
                    }}
                  />
                )}

                {/* Loading spinner */}
                {!imgReady && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-6 w-6 rounded-full border-2 border-white/20 border-t-white/70 animate-spin" />
                  </div>
                )}

                {/* Rule-of-thirds overlay */}
                {imgReady && (
                  <div className="pointer-events-none absolute inset-0">
                    <div className="absolute inset-x-0 top-1/3 h-px bg-white/10" />
                    <div className="absolute inset-x-0 top-2/3 h-px bg-white/10" />
                    <div className="absolute inset-y-0 left-1/3 w-px bg-white/10" />
                    <div className="absolute inset-y-0 left-2/3 w-px bg-white/10" />
                    <div className="absolute inset-0 rounded-xl ring-1 ring-white/20" />
                  </div>
                )}
              </div>

              {/* Zoom slider — only for static images */}
              {!isGif && (
                <div className="mt-3 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => applyZoom(Math.max(1, zoom - 0.1))}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <ZoomOut size={14} />
                  </button>
                  <input
                    type="range"
                    min={100}
                    max={MAX_ZOOM * 100}
                    step={1}
                    value={Math.round(zoom * 100)}
                    onChange={e => applyZoom(Number(e.target.value) / 100)}
                    className="flex-1 accent-sky-500"
                  />
                  <button
                    type="button"
                    onClick={() => applyZoom(Math.min(MAX_ZOOM, zoom + 0.1))}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <ZoomIn size={14} />
                  </button>
                  <span className="w-10 shrink-0 text-right text-xs font-bold tabular-nums text-slate-400">
                    {Math.round(zoom * 100)}%
                  </span>
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className="flex gap-2.5 px-4 pb-4">
              <Button variant="ghost" size="sm" onClick={onClose} className="flex-1">
                Annuleren
              </Button>
              <Button
                size="sm"
                className="flex-1"
                loading={saving}
                disabled={!imgReady}
                onClick={handleConfirm}
              >
                <Upload size={13} />
                {isGif ? "Uploaden" : "Bijsnijden & uploaden"}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
