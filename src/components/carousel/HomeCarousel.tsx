
import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Instagram } from "lucide-react";
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
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    // Carregar clientes do localStorage
    const loadClients = () => {
      const stored = localStorage.getItem('carousel_clients');
      if (stored) {
        const allClients = JSON.parse(stored);
        const activeClients = allClients.filter((client: ClientItem) => client.active);
        setClients(activeClients);
      } else {
        // Dados padrão se não houver no localStorage
        setClients([
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
      }
    };

    loadClients();

    // Listener para mudanças no localStorage
    const handleStorageChange = () => {
      loadClients();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    if (clients.length === 0 || isPaused || clients.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => 
        prevIndex === clients.length - 1 ? 0 : prevIndex + 1
      );
    }, 4000);

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
    <section className="relative w-full py-20 bg-[#020817]" id="clientes">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-4xl md:text-5xl font-extralight text-[#efc349] mb-6"
          >
            Alguns de nossos Clientes
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl text-white/80 font-extralight max-w-2xl mx-auto"
          >
            Empresas que confiam em nossos serviços contábeis e de gestão empresarial
          </motion.p>
        </div>

        <div className="relative max-w-4xl mx-auto">
          <div 
            className="overflow-hidden"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.7, ease: "easeInOut" }}
                className="flex flex-col items-center justify-center p-12 bg-white/5 backdrop-blur-sm border border-[#efc349]/20 rounded-2xl min-h-[320px] hover:bg-white/10 transition-all duration-300"
              >
                <div className="mb-8">
                  <motion.img
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    src={clients[currentIndex]?.logo_url}
                    alt={clients[currentIndex]?.name}
                    className="max-h-32 w-auto object-contain filter brightness-0 invert hover:filter hover:brightness-100 hover:invert-0 transition-all duration-300"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/placeholder.svg";
                    }}
                  />
                </div>
                
                <motion.h3 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="text-2xl font-light text-white mb-6 text-center"
                >
                  {clients[currentIndex]?.name}
                </motion.h3>
                
                {clients[currentIndex]?.instagram_url && (
                  <motion.a
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                    href={clients[currentIndex]?.instagram_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-[#efc349] hover:text-[#efc349]/80 transition-colors group"
                  >
                    <Instagram className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                    <span className="font-light">Siga-nos no Instagram</span>
                  </motion.a>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation Arrows - only show if more than one item */}
          {clients.length > 1 && (
            <>
              <button
                onClick={goToPrevious}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-[#efc349]/20 hover:bg-[#efc349]/40 backdrop-blur-sm rounded-full p-3 transition-all shadow-lg group"
              >
                <ChevronLeft className="w-6 h-6 text-[#efc349] group-hover:scale-110 transition-transform" />
              </button>

              <button
                onClick={goToNext}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-[#efc349]/20 hover:bg-[#efc349]/40 backdrop-blur-sm rounded-full p-3 transition-all shadow-lg group"
              >
                <ChevronRight className="w-6 h-6 text-[#efc349] group-hover:scale-110 transition-transform" />
              </button>
            </>
          )}

          {/* Dots Indicator - only show if more than one item */}
          {clients.length > 1 && (
            <div className="flex justify-center mt-8 space-x-3">
              {clients.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    index === currentIndex 
                      ? 'bg-[#efc349] scale-125' 
                      : 'bg-white/30 hover:bg-white/50 hover:scale-110'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Mobile responsive adjustments */}
        <style jsx>{`
          @media (max-width: 768px) {
            .container {
              padding-left: 1rem;
              padding-right: 1rem;
            }
          }
        `}</style>
      </div>
    </section>
  );
};

export default HomeCarousel;
