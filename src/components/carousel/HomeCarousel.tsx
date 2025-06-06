
import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Instagram, ExternalLink } from "lucide-react";
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
    }, 5000);

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
    <section className="relative w-full py-24 bg-gradient-to-b from-[#020817] via-[#0b1320] to-[#020817]" id="clientes">
      <div className="container mx-auto px-4">
        <div className="text-center mb-20">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-8"
          >
            <span className="inline-block px-4 py-2 bg-[#efc349]/10 border border-[#efc349]/20 rounded-full text-[#efc349] text-sm font-light mb-4">
              Nossos Parceiros
            </span>
            <h2 className="text-5xl md:text-6xl font-extralight text-white mb-6 leading-tight">
              Clientes que <span className="text-[#efc349]">Confiam</span>
            </h2>
            <p className="text-xl text-white/70 font-extralight max-w-3xl mx-auto leading-relaxed">
              Empresas de diversos segmentos que escolheram nossa expertise em gestão contábil e empresarial
            </p>
          </motion.div>
        </div>

        <div className="relative max-w-6xl mx-auto">
          <div 
            className="overflow-hidden rounded-3xl"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, scale: 0.95, rotateY: 10 }}
                animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                exit={{ opacity: 0, scale: 0.95, rotateY: -10 }}
                transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="relative bg-gradient-to-br from-white/10 via-white/5 to-transparent backdrop-blur-xl border border-[#efc349]/20 rounded-3xl p-16 min-h-[400px] group"
              >
                {/* Background pattern */}
                <div className="absolute inset-0 opacity-50" style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23efc349' fill-opacity='0.03'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                }}></div>
                
                {/* Glow effect */}
                <div className="absolute inset-0 bg-gradient-radial from-[#efc349]/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                <div className="relative z-10 flex flex-col items-center justify-center text-center space-y-8">
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="relative"
                  >
                    <div className="absolute inset-0 bg-[#efc349]/20 blur-2xl rounded-full"></div>
                    <img
                      src={clients[currentIndex]?.logo_url}
                      alt={clients[currentIndex]?.name}
                      className="relative max-h-32 w-auto object-contain filter brightness-0 invert group-hover:filter group-hover:brightness-100 group-hover:invert-0 transition-all duration-500 transform group-hover:scale-110"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/placeholder.svg";
                      }}
                    />
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="space-y-4"
                  >
                    <h3 className="text-3xl font-light text-white group-hover:text-[#efc349] transition-colors duration-300">
                      {clients[currentIndex]?.name}
                    </h3>
                    
                    {clients[currentIndex]?.instagram_url && (
                      <motion.a
                        href={clients[currentIndex]?.instagram_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-[#efc349]/20 to-[#efc349]/10 hover:from-[#efc349]/30 hover:to-[#efc349]/20 border border-[#efc349]/30 rounded-full text-[#efc349] hover:text-white transition-all duration-300 group/link"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Instagram className="w-5 h-5 group-hover/link:rotate-12 transition-transform duration-300" />
                        <span className="font-light">Siga no Instagram</span>
                        <ExternalLink className="w-4 h-4 opacity-60" />
                      </motion.a>
                    )}
                  </motion.div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation Arrows - only show if more than one item */}
          {clients.length > 1 && (
            <>
              <motion.button
                onClick={goToPrevious}
                className="absolute left-6 top-1/2 transform -translate-y-1/2 bg-[#efc349]/20 hover:bg-[#efc349]/40 backdrop-blur-sm rounded-full p-4 transition-all duration-300 shadow-xl border border-[#efc349]/30 group"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <ChevronLeft className="w-6 h-6 text-[#efc349] group-hover:text-white transition-colors duration-300" />
              </motion.button>

              <motion.button
                onClick={goToNext}
                className="absolute right-6 top-1/2 transform -translate-y-1/2 bg-[#efc349]/20 hover:bg-[#efc349]/40 backdrop-blur-sm rounded-full p-4 transition-all duration-300 shadow-xl border border-[#efc349]/30 group"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <ChevronRight className="w-6 h-6 text-[#efc349] group-hover:text-white transition-colors duration-300" />
              </motion.button>
            </>
          )}

          {/* Enhanced Dots Indicator */}
          {clients.length > 1 && (
            <div className="flex justify-center mt-12 space-x-3">
              {clients.map((_, index) => (
                <motion.button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`relative overflow-hidden rounded-full transition-all duration-300 ${
                    index === currentIndex 
                      ? 'w-12 h-4 bg-[#efc349]' 
                      : 'w-4 h-4 bg-white/30 hover:bg-white/50'
                  }`}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                >
                  {index === currentIndex && (
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                      animate={{ x: [-48, 48] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    />
                  )}
                </motion.button>
              ))}
            </div>
          )}
        </div>

        {/* Additional decorative elements */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-[#efc349]/5 rounded-full blur-xl"></div>
        <div className="absolute bottom-20 right-10 w-32 h-32 bg-[#efc349]/5 rounded-full blur-xl"></div>
      </div>
    </section>
  );
};

export default HomeCarousel;
