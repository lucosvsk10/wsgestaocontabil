
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CarouselNavigationProps {
  onPrevious: () => void;
  onNext: () => void;
  hasMultipleClients: boolean;
}

const CarouselNavigation = ({ onPrevious, onNext, hasMultipleClients }: CarouselNavigationProps) => {
  if (!hasMultipleClients) return null;

  return (
    <>
      <button
        onClick={onPrevious}
        className="absolute left-4 lg:-left-16 top-1/2 transform -translate-y-1/2 bg-white dark:bg-[#efc349]/20 hover:bg-gray-50 dark:hover:bg-[#efc349]/40 backdrop-blur-sm rounded-full p-3 transition-all duration-300 shadow-lg border border-gray-200/20 dark:border-[#efc349]/30 group"
        aria-label="Cliente anterior"
      >
        <ChevronLeft className="w-6 h-6 text-[#020817] dark:text-[#efc349] group-hover:text-[#efc349] dark:group-hover:text-white transition-colors duration-300" />
      </button>

      <button
        onClick={onNext}
        className="absolute right-4 lg:-right-16 top-1/2 transform -translate-y-1/2 bg-white dark:bg-[#efc349]/20 hover:bg-gray-50 dark:hover:bg-[#efc349]/40 backdrop-blur-sm rounded-full p-3 transition-all duration-300 shadow-lg border border-gray-200/20 dark:border-[#efc349]/30 group"
        aria-label="Próximo cliente"
      >
        <ChevronRight className="w-6 h-6 text-[#020817] dark:text-[#efc349] group-hover:text-[#efc349] dark:group-hover:text-white transition-colors duration-300" />
      </button>
    </>
  );
};

export default CarouselNavigation;
