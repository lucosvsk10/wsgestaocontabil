
import { useState, useRef } from "react";
import { useMotionValue } from "framer-motion";

interface UseCarouselAnimationProps {
  clientsLength: number;
}

export const useCarouselAnimation = ({ clientsLength }: UseCarouselAnimationProps) => {
  const [isPaused, setIsPaused] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(0);
  const animationRef = useRef<any>(null);
  const x = useMotionValue(0);

  // Calcular a distância total que a animação deve percorrer
  const totalDistance = (clientsLength * 300) + (clientsLength * 24);
  
  // Calcular a duração total baseada no número de clientes
  const totalDuration = clientsLength * 4;

  const pauseAnimation = () => {
    if (animationRef.current) {
      // Capturar a posição atual da animação
      const current = x.get();
      setCurrentPosition(current);
      setIsPaused(true);
    }
  };

  const resumeAnimation = () => {
    setIsPaused(false);
  };

  const getAnimationConfig = () => {
    if (isPaused) {
      return {
        x: currentPosition,
        transition: { duration: 0 }
      };
    }

    // Calcular distância restante e duração ajustada
    const distanceRemaining = totalDistance + currentPosition;
    const progressPercentage = Math.abs(currentPosition) / totalDistance;
    const remainingDuration = totalDuration * (1 - progressPercentage);

    return {
      x: [currentPosition, -totalDistance, 0],
      transition: {
        x: {
          repeat: Infinity,
          repeatType: "loop" as const,
          duration: remainingDuration > 0 ? remainingDuration : totalDuration,
          ease: "linear",
          times: remainingDuration > 0 ? [0, (distanceRemaining / totalDistance), 1] : [0, 1]
        }
      }
    };
  };

  return {
    isPaused,
    pauseAnimation,
    resumeAnimation,
    getAnimationConfig,
    animationRef,
    x,
    setCurrentPosition
  };
};
