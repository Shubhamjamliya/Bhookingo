import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function SplashScreen({ onFinish }) {
  const [stage, setStage] = useState("entrance"); // "entrance" -> "hold" -> "exit"

  useEffect(() => {
    // 1. Preload logo image immediately
    const img = new Image();
    img.src = "/logoorange.png";

    // 2. Sequence timing:
    // Entrance: 0 - 600ms (scale 0.8 -> 1.0, opacity 0 -> 1)
    // Hold: 600ms - 1300ms (stay at 1.0)
    // Exit: 1300ms - 1600ms (scale 1.0 -> 1.05, opacity 1 -> 0)
    const holdTimer = setTimeout(() => {
      setStage("hold");
    }, 600);

    const exitTimer = setTimeout(() => {
      setStage("exit");
    }, 1300);

    const finishTimer = setTimeout(() => {
      if (onFinish) onFinish();
    }, 1600);

    return () => {
      clearTimeout(holdTimer);
      clearTimeout(exitTimer);
      clearTimeout(finishTimer);
    };
  }, [onFinish]);

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-[#EB590E] overflow-hidden select-none">
      <AnimatePresence>
        {stage !== "done" && (
          <motion.div
            key="splash-logo-container"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={
              stage === "exit"
                ? { opacity: 0, scale: 1.05 }
                : { opacity: 1, scale: 1 }
            }
            transition={{
              duration: stage === "exit" ? 0.3 : 0.6,
              ease: stage === "exit" ? "easeInOut" : [0.16, 1, 0.3, 1]
            }}
            className="relative flex flex-col items-center justify-center p-6 text-center"
            style={{ willChange: "transform, opacity" }}
          >
            <img
              src="/logoorange.png"
              alt="Bhookingo"
              className="h-24 sm:h-28 md:h-32 w-auto object-contain"
            />
            <h1 className="mt-4 text-3xl sm:text-4xl font-black text-white tracking-widest uppercase font-sans">
              BHOOKINGO
            </h1>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
