
import { useState, useRef, useCallback, useEffect } from "react";

interface UseCarouselAnimationProps {
  clientsLength: number;
}

export const useCarouselAnimation = ({ clientsLength }: UseCarouselAnimationProps) => {
  const [isPaused, setIsPaused] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(0);
  const animationRef = useRef<any>(null);

  // Calcular a largura de um conjunto de clientes (um "ciclo" completo)
  const itemWidth = 300; // largura do card
  const gap = 24; // gap entre cards
  const singleSetWidth = clientsLength * (itemWidth + gap);
  
  // Duração baseada na quantidade de itens para manter velocidade consistente
  const duration = clientsLength * 3; // 3 segundos por item

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

    // Animação infinita que move continuamente para a direita
    // Começamos em 0 e movemos para -singleSetWidth (uma largura completa do conjunto)
    // Isso cria o efeito de loop infinito
    return {
      x: [0, -singleSetWidth],
      transition: {
        duration: duration,
        ease: "linear",
        repeat: Infinity,
        repeatType: "loop" as const
      }
    };
  }, [isPaused, currentPosition, singleSetWidth, duration]);

  // Reset da posição quando não pausado para garantir sincronização
  useEffect(() => {
    if (!isPaused) {
      setCurrentPosition(0);
    }
  }, [isPaused]);

  return {
    isPaused,
    pauseAnimation,
    resumeAnimation,
    getAnimationConfig,
    animationRef
  };
};
