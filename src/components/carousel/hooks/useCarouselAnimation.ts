
import { useState, useRef, useCallback } from "react";

interface UseCarouselAnimationProps {
  clientsLength: number;
}

export const useCarouselAnimation = ({ clientsLength }: UseCarouselAnimationProps) => {
  const [isPaused, setIsPaused] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(0);
  const animationRef = useRef<any>(null);

  // Calcular a distância total que a animação deve percorrer
  const totalDistance = (clientsLength * 300) + (clientsLength * 24);
  
  // Duração total da animação (mais lenta para suavidade)
  const totalDuration = clientsLength * 6;

  const pauseAnimation = useCallback(() => {
    if (animationRef.current) {
      // Capturar a posição atual usando o transform do elemento
      const element = animationRef.current;
      const computedStyle = window.getComputedStyle(element);
      const matrix = computedStyle.transform;
      
      if (matrix && matrix !== 'none') {
        const matrixValues = matrix.match(/matrix.*\((.+)\)/);
        if (matrixValues) {
          const values = matrixValues[1].split(', ');
          const translateX = parseFloat(values[4]) || 0;
          setCurrentPosition(translateX);
        }
      }
      
      setIsPaused(true);
    }
  }, []);

  const resumeAnimation = useCallback(() => {
    setIsPaused(false);
  }, []);

  const getAnimationConfig = useCallback(() => {
    if (isPaused) {
      return {
        x: currentPosition,
        transition: { 
          duration: 0,
          ease: "linear"
        }
      };
    }

    // Calcular a duração restante baseada na posição atual
    const progress = Math.abs(currentPosition) / totalDistance;
    const remainingDuration = totalDuration * (1 - (progress % 1));

    return {
      x: [currentPosition, currentPosition - totalDistance, 0],
      transition: {
        duration: remainingDuration > 0 ? remainingDuration : totalDuration,
        ease: "linear",
        repeat: Infinity,
        repeatType: "loop" as const
      }
    };
  }, [isPaused, currentPosition, totalDistance, totalDuration]);

  return {
    isPaused,
    pauseAnimation,
    resumeAnimation,
    getAnimationConfig,
    animationRef,
    setCurrentPosition
  };
};
