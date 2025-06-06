
import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Instagram, Star } from "lucide-react";
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
    <section className="relative w-full py-24 bg-gradient-to-br from-[#FFF1DE] to-[#F5E6B8] dark:from-[#020817] dark:to-[#0b1320]" id="clientes">
      <div className="container mx-auto px-4">
        {/* Header Section */}
        <div className="text-center mb-16">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="flex items-center justify-center mb-6"
          >
            <div className="flex items-center space-x-2">
              <Star className="w-8 h-8 text-[#efc349] fill-current" />
              <h2 className="text-4xl md:text-6xl font-extralight text-[#020817] dark:text-[#efc349]">
                Nossos Clientes
              </h2>
              <Star className="w-8 h-8 text-[#efc349] fill-current" />
            </div>
          </motion.div>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl md:text-2xl text-gray-600 dark:text-white/80 font-extralight max-w-3xl mx-auto leading-relaxed"
          >
            Empresas que confiam em nossa expertise contábil e crescem conosco
          </motion.p>
        </div>

        {/* Carousel Container */}
        <div className="relative max-w-6xl mx-auto">
          <div 
            className="relative overflow-hidden rounded-3xl bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-[#efc349]/20 shadow-2xl"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, scale: 0.95, rotateY: -10 }}
                animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                exit={{ opacity: 0, scale: 0.95, rotateY: 10 }}
                transition={{ 
                  duration: 0.8, 
                  ease: [0.4, 0, 0.2, 1],
                  type: "spring",
                  stiffness: 100
                }}
                className="relative"
              >
                <div className="flex flex-col lg:flex-row items-center justify-between p-12 lg:p-16 min-h-[400px]">
                  {/* Logo Section */}
                  <div className="flex-1 flex justify-center lg:justify-start mb-8 lg:mb-0">
                    <motion.div
                      initial={{ opacity: 0, x: -50 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.6, delay: 0.2 }}
                      className="relative group"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-[#efc349]/20 to-[#efc349]/40 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
                      <div className="relative bg-white dark:bg-[#020817] p-8 rounded-2xl shadow-lg border border-[#efc349]/30 group-hover:border-[#efc349]/60 transition-all duration-300">
                        <img
                          src={clients[currentIndex]?.logo_url}
                          alt={clients[currentIndex]?.name}
                          className="max-h-32 w-auto object-contain filter drop-shadow-lg transition-transform duration-300 group-hover:scale-105"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/placeholder.svg";
                          }}
                        />
                      </div>
                    </motion.div>
                  </div>
                  
                  {/* Content Section */}
                  <div className="flex-1 text-center lg:text-left lg:pl-12">
                    <motion.h3 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.3 }}
                      className="text-3xl lg:text-4xl font-light text-[#020817] dark:text-white mb-6 leading-tight"
                    >
                      {clients[currentIndex]?.name}
                    </motion.h3>
                    
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.4 }}
                      className="space-y-4"
                    >
                      <p className="text-lg text-gray-600 dark:text-gray-300 font-extralight leading-relaxed">
                        Cliente satisfeito que confia em nossos serviços contábeis especializados
                      </p>
                      
                      {clients[currentIndex]?.instagram_url && (
                        <motion.a
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.6, delay: 0.5 }}
                          href={clients[currentIndex]?.instagram_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-[#efc349] to-[#f1c95c] text-[#020817] rounded-full hover:shadow-lg transition-all duration-300 hover:scale-105 font-medium"
                        >
                          <Instagram className="w-5 h-5 mr-2" />
                          Siga no Instagram
                        </motion.a>
                      )}
                    </motion.div>
                  </div>
                </div>

                {/* Decorative Elements */}
                <div className="absolute top-6 right-6 w-20 h-20 bg-gradient-to-br from-[#efc349]/20 to-[#efc349]/40 rounded-full blur-xl"></div>
                <div className="absolute bottom-6 left-6 w-16 h-16 bg-gradient-to-br from-[#efc349]/20 to-[#efc349]/40 rounded-full blur-xl"></div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation Arrows */}
          {clients.length > 1 && (
            <>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={goToPrevious}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/90 dark:bg-[#020817]/90 hover:bg-white dark:hover:bg-[#020817] backdrop-blur-sm rounded-full p-4 transition-all shadow-xl border border-[#efc349]/30 hover:border-[#efc349] z-10"
              >
                <ChevronLeft className="w-6 h-6 text-[#020817] dark:text-[#efc349]" />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={goToNext}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/90 dark:bg-[#020817]/90 hover:bg-white dark:hover:bg-[#020817] backdrop-blur-sm rounded-full p-4 transition-all shadow-xl border border-[#efc349]/30 hover:border-[#efc349] z-10"
              >
                <ChevronRight className="w-6 h-6 text-[#020817] dark:text-[#efc349]" />
              </motion.button>
            </>
          )}

          {/* Dots Indicator */}
          {clients.length > 1 && (
            <div className="flex justify-center mt-12 space-x-3">
              {clients.map((_, index) => (
                <motion.button
                  key={index}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.8 }}
                  onClick={() => goToSlide(index)}
                  className={`relative h-3 rounded-full transition-all duration-300 ${
                    index === currentIndex 
                      ? 'w-12 bg-[#efc349] shadow-lg' 
                      : 'w-3 bg-gray-300 dark:bg-white/30 hover:bg-gray-400 dark:hover:bg-white/50'
                  }`}
                >
                  {index === currentIndex && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="absolute inset-0 bg-[#efc349] rounded-full shadow-lg"
                    />
                  )}
                </motion.button>
              ))}
            </div>
          )}
        </div>

        {/* Bottom Decoration */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="text-center mt-16"
        >
          <div className="inline-flex items-center space-x-4 px-8 py-4 bg-white/60 dark:bg-white/10 backdrop-blur-sm rounded-full border border-[#efc349]/20">
            <div className="flex space-x-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 text-[#efc349] fill-current" />
              ))}
            </div>
            <span className="text-[#020817] dark:text-white font-extralight">
              Excelência em serviços contábeis
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HomeCarousel;
