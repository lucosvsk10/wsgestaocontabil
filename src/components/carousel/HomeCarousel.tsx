
import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Instagram } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

interface ClientItem {
  id: string;
  name: string;
  logo_url: string;
  instagram_url?: string;
  order_index: number;
  active: boolean;
}

const HomeCarousel = () => {
  // Dados locais para clientes - gerenciados pelo frontend
  const [clients] = useState<ClientItem[]>([
    {
      id: "1",
      name: "Empresa Exemplo 1",
      logo_url: "/lovable-uploads/cb878201-552e-4728-a814-1554857917b4.png",
      instagram_url: "https://instagram.com/empresa1",
      order_index: 0,
      active: true
    },
    {
      id: "2", 
      name: "Empresa Exemplo 2",
      logo_url: "/lovable-uploads/cb878201-552e-4728-a814-1554857917b4.png",
      instagram_url: "https://instagram.com/empresa2",
      order_index: 1,
      active: true
    },
    {
      id: "3",
      name: "Empresa Exemplo 3", 
      logo_url: "/lovable-uploads/cb878201-552e-4728-a814-1554857917b4.png",
      instagram_url: "https://instagram.com/empresa3",
      order_index: 2,
      active: true
    }
  ]);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (clients.length === 0 || isPaused || clients.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => 
        prevIndex === clients.length - 1 ? 0 : prevIndex + 1
      );
    }, 3000);

    return () => clearInterval(interval);
  }, [clients.length, isPaused]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  const goToPrevious = () => {
    setCurrentIndex(currentIndex === 0 ? clients.length - 1 : currentIndex - 1);
  };

  const goToNext = () => {
    setCurrentIndex(currentIndex === clients.length - 1 ? 0 : currentIndex + 1);
  };

  if (clients.length === 0) return null;

  return (
    <section className="relative w-full py-16 bg-white dark:bg-[#0b1320]" id="clientes">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-extralight text-[#020817] dark:text-[#efc349] mb-4">
            Alguns de nossos Clientes
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 font-extralight">
            Empresas que confiam em nossos serviços
          </p>
        </div>

        <div className="relative max-w-2xl mx-auto">
          <div 
            className="overflow-hidden rounded-lg"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ duration: 0.5 }}
                className="flex flex-col items-center justify-center p-8 bg-gray-50 dark:bg-[#020817] min-h-[300px]"
              >
                <div className="mb-6">
                  <img
                    src={clients[currentIndex]?.logo_url}
                    alt={clients[currentIndex]?.name}
                    className="max-h-24 w-auto object-contain filter grayscale hover:grayscale-0 transition-all duration-300"
                  />
                </div>
                
                <h3 className="text-xl font-medium text-[#020817] dark:text-white mb-4">
                  {clients[currentIndex]?.name}
                </h3>
                
                {clients[currentIndex]?.instagram_url && (
                  <a
                    href={clients[currentIndex]?.instagram_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-[#efc349] hover:text-[#efc349]/80 transition-colors"
                  >
                    <Instagram className="w-5 h-5 mr-2" />
                    Siga-nos no Instagram
                  </a>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation Arrows - only show if more than one item */}
          {clients.length > 1 && (
            <>
              <button
                onClick={goToPrevious}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white backdrop-blur-sm rounded-full p-2 transition-colors shadow-lg"
              >
                <ChevronLeft className="w-6 h-6 text-[#020817]" />
              </button>

              <button
                onClick={goToNext}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white backdrop-blur-sm rounded-full p-2 transition-colors shadow-lg"
              >
                <ChevronRight className="w-6 h-6 text-[#020817]" />
              </button>
            </>
          )}

          {/* Dots Indicator - only show if more than one item */}
          {clients.length > 1 && (
            <div className="flex justify-center mt-6 space-x-2">
              {clients.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    index === currentIndex 
                      ? 'bg-[#efc349]' 
                      : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default HomeCarousel;
