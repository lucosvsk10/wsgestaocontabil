
import { useState, useRef, useCallback, useMemo } from "react";

interface UseCarouselAnimationProps {
  clientsLength: number;
}

export const useCarouselAnimation = ({ clientsLength }: UseCarouselAnimationProps) => {
  const [isPaused, setIsPaused] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(0);
  const animationRef = useRef<any>(null);
  const pauseTimeoutRef = useRef<NodeJS.Timeout>();

  // Memoizar cálculos custosos
  const animationConstants = useMemo(() => {
    const cardWidth = 300;
    const gap = 24;
    const totalDistance = (clientsLength * cardWidth) + (clientsLength * gap);
    const totalDuration = clientsLength * 6;
    
    return { totalDistance, totalDuration, cardWidth, gap };
  }, [clientsLength]);

  const pauseAnimation = useCallback(() => {
    // Debounce para evitar múltiplas chamadas
    if (pauseTimeoutRef.current) {
      clearTimeout(pauseTimeoutRef.current);
    }

    pauseTimeoutRef.current = setTimeout(() => {
      if (animationRef.current) {
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
    }, 50);
  }, []);

  const resumeAnimation = useCallback(() => {
    if (pauseTimeoutRef.current) {
      clearTimeout(pauseTimeoutRef.current);
    }
    setIsPaused(false);
  }, []);

  const getAnimationConfig = useCallback(() => {
    const { totalDistance, totalDuration } = animationConstants;

    if (isPaused) {
      return {
        x: currentPosition,
        transition: { 
          duration: 0,
          ease: "linear"
        }
      };
    }

    // Otimizar cálculo de progresso
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
  }, [isPaused, currentPosition, animationConstants]);

  return {
    isPaused,
    pauseAnimation,
    resumeAnimation,
    getAnimationConfig,
    animationRef,
    setCurrentPosition
  };
};
