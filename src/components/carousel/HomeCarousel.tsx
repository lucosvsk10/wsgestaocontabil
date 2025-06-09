
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
        setClients([{
          id: "1",
          name: "Empresa Exemplo 1",
          logo_url: "/lovable-uploads/cb878201-552e-4728-a814-1554857917b4.png",
          instagram_url: "https://instagram.com/empresa1",
          order_index: 0,
          active: true
        }, {
          id: "2",
          name: "Empresa Exemplo 2",
          logo_url: "/lovable-uploads/cb878201-552e-4728-a814-1554857917b4.png",
          instagram_url: "https://instagram.com/empresa2",
          order_index: 1,
          active: true
        }, {
          id: "3",
          name: "Empresa Exemplo 3",
          logo_url: "/lovable-uploads/cb878201-552e-4728-a814-1554857917b4.png",
          instagram_url: "https://instagram.com/empresa3",
          order_index: 2,
          active: true
        }, {
          id: "4",
          name: "Empresa Exemplo 4",
          logo_url: "/lovable-uploads/cb878201-552e-4728-a814-1554857917b4.png",
          instagram_url: "https://instagram.com/empresa4",
          order_index: 3,
          active: true
        }, {
          id: "5",
          name: "Empresa Exemplo 5",
          logo_url: "/lovable-uploads/cb878201-552e-4728-a814-1554857917b4.png",
          instagram_url: "https://instagram.com/empresa5",
          order_index: 4,
          active: true
        }, {
          id: "6",
          name: "Empresa Exemplo 6",
          logo_url: "/lovable-uploads/cb878201-552e-4728-a814-1554857917b4.png",
          instagram_url: "https://instagram.com/empresa6",
          order_index: 5,
          active: true
        }]);
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

  // Auto-advance carousel
  useEffect(() => {
    if (clients.length === 0 || isPaused || clients.length <= 4) return;

    const interval = setInterval(() => {
      setCurrentIndex(prevIndex => {
        const maxIndex = Math.max(0, clients.length - 4);
        return prevIndex >= maxIndex ? 0 : prevIndex + 1;
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [clients.length, isPaused]);

  const goToPrevious = () => {
    setCurrentIndex(prevIndex => {
      if (prevIndex <= 0) {
        return Math.max(0, clients.length - 4);
      }
      return prevIndex - 1;
    });
  };

  const goToNext = () => {
    setCurrentIndex(prevIndex => {
      const maxIndex = Math.max(0, clients.length - 4);
      return prevIndex >= maxIndex ? 0 : prevIndex + 1;
    });
  };

  if (clients.length === 0) return null;

  // Se temos 4 ou menos clientes, mostrar todos sem carrossel
  const shouldShowCarousel = clients.length > 4;
  const visibleClients = shouldShowCarousel ? clients.slice(currentIndex, currentIndex + 4) : clients;

  // Se temos menos de 4 clientes visíveis no final, completar com os do início
  if (shouldShowCarousel && visibleClients.length < 4) {
    const remaining = 4 - visibleClients.length;
    visibleClients.push(...clients.slice(0, remaining));
  }

  return (
    <section className="relative w-full py-24 bg-[#FFF1DE] dark:bg-gradient-to-b dark:from-[#020817] dark:via-[#0b1320] dark:to-[#020817]" id="clientes">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <motion.div 
            initial={{ opacity: 0, y: 40 }} 
            whileInView={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.8 }} 
            className="mb-8"
          >
            <span className="inline-block px-4 py-2 bg-[#efc349]/10 border border-[#efc349]/20 rounded-full text-[#efc349] text-sm font-light mb-4">
              Nossos Parceiros
            </span>
            <h2 className="text-5xl font-extralight text-[#020817] dark:text-white mb-6 leading-tight md:text-4xl">
              Clientes que <span className="text-[#efc349]">Confiam</span>
            </h2>
            <p className="text-[#020817]/70 dark:text-white/70 font-extralight max-w-3xl mx-auto leading-relaxed text-lg">
              Empresas de diversos segmentos que escolheram nossa expertise em gestão contábil e empresarial
            </p>
          </motion.div>
        </div>

        <div className="relative max-w-7xl mx-auto">
          <div 
            className="overflow-hidden" 
            onMouseEnter={() => setIsPaused(true)} 
            onMouseLeave={() => setIsPaused(false)}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ x: 300, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -300, opacity: 0 }}
                transition={{ 
                  duration: 0.5, 
                  ease: "easeInOut" 
                }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
              >
                {visibleClients.map((client, index) => (
                  <motion.div
                    key={`${client.id}-${currentIndex}-${index}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ 
                      duration: 0.4, 
                      delay: index * 0.1 
                    }}
                    className="group relative"
                  >
                    <div className="bg-white dark:bg-[#0b1320] rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-[#efc349]/20 group h-full">
                      {/* Logo */}
                      <div className="relative mb-6 flex-1 flex items-center justify-center w-full">
                        <img 
                          src={client.logo_url} 
                          alt={client.name} 
                          className="max-h-20 max-w-32 w-auto object-contain filter grayscale-0 transition-all duration-300" 
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/placeholder.svg";
                          }} 
                        />
                      </div>
                      
                      {/* Nome da empresa */}
                      <h3 className="text-lg font-light text-[#020817] dark:text-white text-center mb-4 line-clamp-2">
                        {client.name}
                      </h3>
                      
                      {/* Link do Instagram */}
                      {client.instagram_url && (
                        <a 
                          href={client.instagram_url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="inline-flex items-center space-x-2 px-4 py-2 bg-[#efc349]/10 hover:bg-[#efc349]/20 border border-[#efc349]/30 rounded-full text-[#efc349] hover:text-[#020817] dark:hover:text-[#020817] transition-all duration-300 text-sm font-light group/link"
                        >
                          <Instagram className="w-4 h-4 group-hover/link:rotate-12 transition-transform duration-300" />
                          <span>Instagram</span>
                          <ExternalLink className="w-3 h-3 opacity-60" />
                        </a>
                      )}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation Arrows - only show if we have carousel */}
          {shouldShowCarousel && (
            <>
              <button
                onClick={goToPrevious}
                className="absolute left-4 lg:-left-16 top-1/2 transform -translate-y-1/2 bg-white dark:bg-[#efc349]/20 hover:bg-gray-50 dark:hover:bg-[#efc349]/40 backdrop-blur-sm rounded-full p-3 transition-all duration-300 shadow-lg border border-gray-200/20 dark:border-[#efc349]/30 group"
                aria-label="Cliente anterior"
              >
                <ChevronLeft className="w-6 h-6 text-[#020817] dark:text-[#efc349] group-hover:text-[#efc349] dark:group-hover:text-white transition-colors duration-300" />
              </button>

              <button
                onClick={goToNext}
                className="absolute right-4 lg:-right-16 top-1/2 transform -translate-y-1/2 bg-white dark:bg-[#efc349]/20 hover:bg-gray-50 dark:hover:bg-[#efc349]/40 backdrop-blur-sm rounded-full p-3 transition-all duration-300 shadow-lg border border-gray-200/20 dark:border-[#efc349]/30 group"
                aria-label="Próximo cliente"
              >
                <ChevronRight className="w-6 h-6 text-[#020817] dark:text-[#efc349] group-hover:text-[#efc349] dark:group-hover:text-white transition-colors duration-300" />
              </button>
            </>
          )}

          {/* Dots Indicator - only show if we have carousel */}
          {shouldShowCarousel && (
            <div className="flex justify-center mt-12 space-x-2">
              {Array.from({ length: Math.ceil(clients.length / 4) }).map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index * 4)}
                  className={`relative overflow-hidden rounded-full transition-all duration-300 ${
                    Math.floor(currentIndex / 4) === index
                      ? 'w-8 h-3 bg-[#efc349]'
                      : 'w-3 h-3 bg-gray-300 dark:bg-white/30 hover:bg-gray-400 dark:hover:bg-white/50'
                  }`}
                  aria-label={`Ir para grupo ${index + 1}`}
                >
                  {Math.floor(currentIndex / 4) === index && (
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
          )}
        </div>

        {/* Decorative elements */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-[#efc349]/5 rounded-full blur-xl"></div>
        <div className="absolute bottom-20 right-10 w-32 h-32 bg-[#efc349]/5 rounded-full blur-xl"></div>
      </div>
    </section>
  );
};

export default HomeCarousel;
