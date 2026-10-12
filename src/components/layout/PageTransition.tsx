// src/components/layout/PageTransition.tsx
import { motion, type Transition } from "framer-motion";
import type { FC, ReactNode } from "react";

type AnimationType = "slide" | "fade" | "scale" | "rotate" | "flip" | "slideUp";

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
  type?: AnimationType;
}

export const PageTransition: FC<PageTransitionProps> = ({
  children,
  className = "",
  type = "fade",
}) => {
  // Default slide animation (what you had before)
  const slideVariants = {
    initial: { opacity: 0, x: -20 },
    in: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
  };

  // Fade only
  const fadeVariants = {
    initial: { opacity: 0 },
    in: { opacity: 1 },
    exit: { opacity: 0 },
  };

  // Scale animation
  const scaleVariants = {
    initial: { opacity: 0, scale: 0.9 },
    in: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 1.1 },
  };

  // Rotate animation
  const rotateVariants = {
    initial: { opacity: 0, rotate: -5 },
    in: { opacity: 1, rotate: 0 },
    exit: { opacity: 0, rotate: 5 },
  };

  // Flip animation (3D)
  const flipVariants = {
    initial: { opacity: 0, rotateX: 90 },
    in: { opacity: 1, rotateX: 0 },
    exit: { opacity: 0, rotateX: -90 },
  };

  // Slide up animation
  const slideUpVariants = {
    initial: { opacity: 0, y: 30 },
    in: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -30 },
  };

  // Map animation type to variants
  const variants = {
    slide: slideVariants,
    fade: fadeVariants,
    scale: scaleVariants,
    rotate: rotateVariants,
    flip: flipVariants,
    slideUp: slideUpVariants,
  };

  // Base transition settings compatible with Framer Motion v12
  const pageTransition: Transition = {
    type: "tween",
    ease: "anticipate",
    duration: 0.4,
  };

  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="exit"
      variants={variants[type]}
      transition={pageTransition}
      className={className}
    >
      {children}
    </motion.div>
  );
};
