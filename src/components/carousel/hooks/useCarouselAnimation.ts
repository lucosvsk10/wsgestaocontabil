
import { useState, useEffect } from "react";

interface UseCarouselAnimationProps {
  clientsLength: number;
}

export const useCarouselAnimation = ({ clientsLength }: UseCarouselAnimationProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Auto-advance carousel
  useEffect(() => {
    if (clientsLength === 0 || isPaused) return;

    const interval = setInterval(() => {
      setCurrentIndex(prevIndex => {
        const nextIndex = prevIndex + 1;
        return nextIndex >= clientsLength ? 0 : nextIndex;
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [clientsLength, isPaused]);

  const goToPrevious = () => {
    setCurrentIndex(prevIndex => {
      return prevIndex <= 0 ? clientsLength - 1 : prevIndex - 1;
    });
  };

  const goToNext = () => {
    setCurrentIndex(prevIndex => {
      return prevIndex >= clientsLength - 1 ? 0 : prevIndex + 1;
    });
  };

  return {
    currentIndex,
    setCurrentIndex,
    isPaused,
    setIsPaused,
    goToPrevious,
    goToNext
  };
};
