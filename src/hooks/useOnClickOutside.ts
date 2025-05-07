
import { useEffect, RefObject } from 'react';

export const useOnClickOutside = (
  ref: RefObject<HTMLElement>,
  handler: (event: MouseEvent | TouchEvent) => void
) => {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      // Nada acontece se clique foi dentro do elemento
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }
      // Executa o manipulador passado somente se o clique foi fora
      handler(event);
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
};
