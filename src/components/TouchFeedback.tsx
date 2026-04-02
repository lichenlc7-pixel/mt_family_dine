import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface TouchPoint {
  id: number;
  x: number;
  y: number;
}

export function TouchFeedback() {
  const [touches, setTouches] = useState<TouchPoint[]>([]);

  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      const newTouch = {
        id: Date.now() + Math.random(),
        x: e.clientX,
        y: e.clientY,
      };
      setTouches((prev) => [...prev, newTouch]);

      setTimeout(() => {
        setTouches((prev) => prev.filter((t) => t.id !== newTouch.id));
      }, 600);
    };

    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-[99999] overflow-hidden">
      <AnimatePresence>
        {touches.map((touch) => (
          <motion.div
            key={touch.id}
            initial={{ scale: 0.5, opacity: 0.4 }}
            animate={{ scale: 1.5, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="absolute w-8 h-8 bg-black/20 border border-black/30 rounded-full"
            style={{
              left: touch.x - 16,
              top: touch.y - 16,
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
