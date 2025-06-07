
import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Instagram, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";

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
  const [itemsPerView, setItemsPerView] = useState(4);

  useEffect(() => {
    const updateItemsPerView = () => {
      if (window.innerWidth < 640) {
        setItemsPerView(1);
      } else if (window.innerWidth < 768) {
        setItemsPerView(2);
      } else if (window.innerWidth < 1024) {
        setItemsPerView(3);
      } else {
        setItemsPerView(4);
      }
    };

    updateItemsPerView();
    window.addEventListener('resize', updateItemsPerView);
    return () => window.removeEventListener('resize', updateItemsPerView);
  }, []);

  useEffect(() => {
    const loadClients = () => {
      const stored = localStorage.getItem('carousel_clients');
      if (stored) {
        const allClients = JSON.parse(stored);
        const activeClients = allClients.filter((client: ClientItem) => client.active);
        setClients(activeClients);
      } else {
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
          },
          {
            id: "4",
            name: "Empresa Exemplo 4", 
            logo_url: "/lovable-uploads/cb878201-552e-4728-a814-1554857917b4.png",
            instagram_url: "https://instagram.com/empresa4",
            order_index: 3,
            active: true
          },
          {
            id: "5",
            name: "Empresa Exemplo 5", 
            logo_url: "/lovable-uploads/cb878201-552e-4728-a814-1554857917b4.png",
            instagram_url: "https://instagram.com/empresa5",
            order_index: 4,
            active: true
          },
          {
            id: "6",
            name: "Empresa Exemplo 6", 
            logo_url: "/lovable-uploads/cb878201-552e-4728-a814-1554857917b4.png",
            instagram_url: "https://instagram.com/empresa6",
            order_index: 5,
            active: true
          }
        ]);
      }
    };

    loadClients();

    const handleStorageChange = () => {
      loadClients();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    if (clients.length <= itemsPerView) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => {
        const maxIndex = Math.max(0, clients.length - itemsPerView);
        return prevIndex >= maxIndex ? 0 : prevIndex + 1;
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [clients.length, itemsPerView]);

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) => {
      const maxIndex = Math.max(0, clients.length - itemsPerView);
      return prevIndex <= 0 ? maxIndex : prevIndex - 1;
    });
  };

  const goToNext = () => {
    setCurrentIndex((prevIndex) => {
      const maxIndex = Math.max(0, clients.length - itemsPerView);
      return prevIndex >= maxIndex ? 0 : prevIndex + 1;
    });
  };

  if (clients.length === 0) return null;

  const maxIndex = Math.max(0, clients.length - itemsPerView);
  const showNavigation = clients.length > itemsPerView;

  return (
    <section className="relative w-full py-16 bg-[#FFF1DE] dark:bg-[#020817]" id="clientes">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="mb-6"
          >
            <span className="inline-block px-4 py-2 bg-[#efc349]/10 border border-[#efc349]/20 rounded-full text-[#efc349] text-sm font-light mb-4">
              Nossos Parceiros
            </span>
            <h2 className="text-4xl md:text-5xl font-extralight text-[#020817] dark:text-white mb-4 leading-tight">
              Clientes que <span className="text-[#efc349]">Confiam</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-white/70 font-extralight max-w-3xl mx-auto leading-relaxed">
              Empresas de diversos segmentos que escolheram nossa expertise em gestão contábil
            </p>
          </motion.div>
        </div>

        <div className="relative max-w-7xl mx-auto">
          <div className="overflow-hidden">
            <motion.div
              className="flex transition-transform duration-500 ease-in-out"
              style={{
                transform: `translateX(-${currentIndex * (100 / itemsPerView)}%)`
              }}
            >
              {clients.map((client, index) => (
                <div
                  key={client.id}
                  className="flex-shrink-0 px-4"
                  style={{ width: `${100 / itemsPerView}%` }}
                >
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    viewport={{ once: true }}
                    className="bg-white dark:bg-[#0b1320] rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-[#efc349]/20 group h-full"
                  >
                    <div className="flex flex-col items-center text-center space-y-4 h-full">
                      <div className="w-20 h-20 flex items-center justify-center bg-gray-50 dark:bg-[#020817] rounded-xl p-4 group-hover:bg-[#efc349]/10 transition-colors duration-300">
                        <img
                          src={client.logo_url}
                          alt={client.name}
                          className="max-w-full max-h-full object-contain filter dark:brightness-0 dark:invert group-hover:scale-110 transition-transform duration-300"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/placeholder.svg";
                          }}
                        />
                      </div>
                      
                      <div className="flex-1 flex flex-col justify-between">
                        <h3 className="text-lg font-light text-[#020817] dark:text-white group-hover:text-[#efc349] transition-colors duration-300 mb-3">
                          {client.name}
                        </h3>
                        
                        {client.instagram_url && (
                          <a
                            href={client.instagram_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center space-x-2 px-4 py-2 bg-[#efc349]/10 hover:bg-[#efc349]/20 border border-[#efc349]/30 rounded-full text-[#efc349] hover:text-[#020817] dark:hover:text-white transition-all duration-300 text-sm"
                          >
                            <Instagram className="w-4 h-4" />
                            <span className="font-light">Instagram</span>
                            <ExternalLink className="w-3 h-3 opacity-60" />
                          </a>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Navigation Arrows */}
          {showNavigation && (
            <>
              <button
                onClick={goToPrevious}
                className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white dark:bg-[#0b1320] hover:bg-[#efc349]/10 dark:hover:bg-[#efc349]/20 backdrop-blur-sm rounded-full p-3 transition-all duration-300 shadow-lg border border-gray-200 dark:border-[#efc349]/30 group z-10"
              >
                <ChevronLeft className="w-5 h-5 text-[#020817] dark:text-[#efc349] group-hover:text-[#efc349] transition-colors duration-300" />
              </button>

              <button
                onClick={goToNext}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white dark:bg-[#0b1320] hover:bg-[#efc349]/10 dark:hover:bg-[#efc349]/20 backdrop-blur-sm rounded-full p-3 transition-all duration-300 shadow-lg border border-gray-200 dark:border-[#efc349]/30 group z-10"
              >
                <ChevronRight className="w-5 h-5 text-[#020817] dark:text-[#efc349] group-hover:text-[#efc349] transition-colors duration-300" />
              </button>
            </>
          )}

          {/* Dots Indicator */}
          {showNavigation && (
            <div className="flex justify-center mt-8 space-x-2">
              {Array.from({ length: maxIndex + 1 }).map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    index === currentIndex 
                      ? 'bg-[#efc349] scale-125' 
                      : 'bg-gray-300 dark:bg-white/30 hover:bg-[#efc349]/50'
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
