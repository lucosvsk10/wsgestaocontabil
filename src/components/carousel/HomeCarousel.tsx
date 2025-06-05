
import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

interface CarouselItem {
  id: string;
  title: string;
  description: string;
  image_url: string;
  button_text?: string;
  button_url?: string;
  order_index: number;
  active: boolean;
}

const HomeCarousel = () => {
  // Dados de exemplo - serão substituídos pelos dados do banco quando disponível
  const [items] = useState<CarouselItem[]>([
    {
      id: "1",
      title: "WS Gestão Contábil",
      description: "Seu parceiro em gestão contábil e fiscal",
      image_url: "/lovable-uploads/cb878201-552e-4728-a814-1554857917b4.png",
      button_text: "Saiba Mais",
      button_url: "#sobre",
      order_index: 0,
      active: true
    }
  ]);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (items.length === 0 || isPaused || items.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => 
        prevIndex === items.length - 1 ? 0 : prevIndex + 1
      );
    }, 5000);

    return () => clearInterval(interval);
  }, [items.length, isPaused]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  const goToPrevious = () => {
    setCurrentIndex(currentIndex === 0 ? items.length - 1 : currentIndex - 1);
  };

  const goToNext = () => {
    setCurrentIndex(currentIndex === items.length - 1 ? 0 : currentIndex + 1);
  };

  if (items.length === 0) return null;

  return (
    <section className="relative w-full h-96 md:h-[500px] overflow-hidden bg-gray-100 dark:bg-[#0b1320]">
      <div className="relative w-full h-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            <div className="relative w-full h-full">
              <img
                src={items[currentIndex]?.image_url}
                alt={items[currentIndex]?.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40" />
              
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-white max-w-4xl mx-auto px-4">
                  <motion.h2
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-3xl md:text-5xl font-extralight mb-4"
                  >
                    {items[currentIndex]?.title}
                  </motion.h2>
                  
                  <motion.p
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-lg md:text-xl mb-6 font-extralight"
                  >
                    {items[currentIndex]?.description}
                  </motion.p>
                  
                  {items[currentIndex]?.button_text && items[currentIndex]?.button_url && (
                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.6 }}
                    >
                      <Button
                        asChild
                        className="bg-[#efc349] hover:bg-[#efc349]/90 text-[#020817] font-extralight"
                      >
                        <a href={items[currentIndex]?.button_url}>
                          {items[currentIndex]?.button_text}
                        </a>
                      </Button>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation Arrows - only show if more than one item */}
        {items.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full p-2 transition-colors"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>

            <button
              onClick={goToNext}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full p-2 transition-colors"
            >
              <ChevronRight className="w-6 h-6 text-white" />
            </button>
          </>
        )}

        {/* Dots Indicator - only show if more than one item */}
        {items.length > 1 && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
            {items.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-3 h-3 rounded-full transition-colors ${
                  index === currentIndex 
                    ? 'bg-[#efc349]' 
                    : 'bg-white/50 hover:bg-white/70'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default HomeCarousel;
