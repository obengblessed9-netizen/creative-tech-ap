import { useState } from "react";
import { X, ZoomIn } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ImageLightboxProps {
  src: string;
  alt: string;
}

const ImageLightbox = ({ src, alt }: ImageLightboxProps) => {
  const [open, setOpen] = useState(false);
  const [scale, setScale] = useState(1);

  const toggleZoom = () => {
    setScale((s) => (s === 1 ? 2.5 : 1));
  };

  return (
    <>
      <div
        className="group relative cursor-zoom-in overflow-hidden rounded-lg bg-card"
        onClick={() => setOpen(true)}
      >
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105 animate-fade-in-slow"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-background/0 opacity-0 transition-all duration-300 group-hover:bg-background/20 group-hover:opacity-100">
          <div className="rounded-full bg-background/60 p-3 backdrop-blur-sm">
            <ZoomIn className="h-6 w-6 text-foreground" />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-xl"
            onClick={() => { setOpen(false); setScale(1); }}
          >
            <button
              onClick={(e) => { e.stopPropagation(); setOpen(false); setScale(1); }}
              className="absolute top-6 right-6 z-50 rounded-full bg-secondary p-2 text-foreground hover:bg-muted transition-colors"
            >
              <X className="h-6 w-6" />
            </button>

            <p className="absolute bottom-6 text-sm text-muted-foreground">
              {scale === 1 ? "Click image to zoom in" : "Click image to zoom out"}
            </p>

            <motion.div
              className="max-h-[90vh] max-w-[90vw] overflow-hidden"
              onClick={(e) => { e.stopPropagation(); toggleZoom(); }}
              style={{ cursor: scale === 1 ? "zoom-in" : "zoom-out" }}
            >
              <motion.img
                src={src}
                alt={alt}
                animate={{ scale }}
                transition={{ type: "spring", stiffness: 200, damping: 30 }}
                className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
                draggable={false}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ImageLightbox;
