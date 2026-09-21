import { useState } from "react";
import { motion } from "framer-motion";

interface SlideToUnlockProps {
  onUnlock: () => void;
}

const SlideToUnlock = ({ onUnlock }: SlideToUnlockProps) => {
  const [isPressed, setIsPressed] = useState(false);
  const [startY, setStartY] = useState(0);

  const handleStart = (e: React.TouchEvent | React.MouseEvent) => {
    setIsPressed(true);
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    setStartY(clientY);
  };

  const handleEnd = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isPressed) return;

    const clientY = "changedTouches" in e ? e.changedTouches[0].clientY : e.clientY;
    const deltaY = startY - clientY; // positive = swiped up

    // Swiping up, or a simple tap, both unlock — mirrors iOS "swipe up to open"
    if (deltaY > 40 || Math.abs(deltaY) < 5) {
      onUnlock();
    }
    setIsPressed(false);
  };

  return (
    <div
      className="flex items-center justify-center py-4 px-20 cursor-pointer select-none touch-none"
      onMouseDown={handleStart}
      onMouseUp={handleEnd}
      onTouchStart={handleStart}
      onTouchEnd={handleEnd}
    >
      {/* iOS-style home indicator bar */}
      <motion.div
        className="w-32 h-[5px] rounded-full bg-white"
        animate={{ opacity: isPressed ? 0.5 : [0.85, 1, 0.85] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
};

export default SlideToUnlock;
