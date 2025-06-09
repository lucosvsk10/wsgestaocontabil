
import { motion } from "framer-motion";
import { ClientItem } from "../types";

interface CarouselIndicatorsProps {
  clients: ClientItem[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
}

const CarouselIndicators = ({ clients, currentIndex, onIndexChange }: CarouselIndicatorsProps) => {
  const shouldShowIndicators = (window.innerWidth >= 768 && clients.length > 4) || (window.innerWidth < 768 && clients.length > 1);
  
  if (!shouldShowIndicators) return null;

  return (
    <div className="flex justify-center mt-12 space-x-2">
      {clients.map((_, index) => (
        <button
          key={index}
          onClick={() => onIndexChange(index)}
          className={`relative overflow-hidden rounded-full transition-all duration-300 ${
            currentIndex === index
              ? 'w-8 h-3 bg-[#efc349]'
              : 'w-3 h-3 bg-gray-300 dark:bg-white/30 hover:bg-gray-400 dark:hover:bg-white/50'
          }`}
          aria-label={`Ir para cliente ${index + 1}`}
        >
          {currentIndex === index && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              animate={{ x: [-32, 32] }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "linear"
              }}
            />
          )}
        </button>
      ))}
    </div>
  );
};

export default CarouselIndicators;
