
import { useState } from "react";

interface UseCarouselAnimationProps {
  clientsLength: number;
}

export const useCarouselAnimation = ({ clientsLength }: UseCarouselAnimationProps) => {
  const [isPaused, setIsPaused] = useState(false);

  return {
    isPaused,
    setIsPaused
  };
};
