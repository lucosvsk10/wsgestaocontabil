
import { motion, AnimatePresence } from "framer-motion";
import { useCarouselData } from "./hooks/useCarouselData";
import { useCarouselAnimation } from "./hooks/useCarouselAnimation";
import CarouselCard from "./components/CarouselCard";
import CarouselNavigation from "./components/CarouselNavigation";
import CarouselIndicators from "./components/CarouselIndicators";

const HomeCarousel = () => {
  const { clients } = useCarouselData();
  const {
    currentIndex,
    setCurrentIndex,
    isPaused,
    setIsPaused,
    goToPrevious,
    goToNext
  } = useCarouselAnimation({ clientsLength: clients.length });

  // Função para obter clientes visíveis baseado no tamanho da tela
  const getVisibleClients = () => {
    if (clients.length === 0) return [];
    
    // Mobile: 1 cliente, Desktop: 4 clientes
    const itemsToShow = window.innerWidth < 768 ? 1 : 4;
    const visibleClients = [];
    
    for (let i = 0; i < itemsToShow; i++) {
      const index = (currentIndex + i) % clients.length;
      visibleClients.push(clients[index]);
    }
    
    return visibleClients;
  };

  if (clients.length === 0) return null;

  const visibleClients = getVisibleClients();

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
            <div className="relative h-80">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentIndex}
                  initial={{ x: 300, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -300, opacity: 0 }}
                  transition={{ 
                    duration: 0.6, 
                    ease: "easeInOut" 
                  }}
                  className="absolute inset-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
                >
                  {visibleClients.map((client, index) => (
                    <CarouselCard 
                      key={`${client.id}-${currentIndex}-${index}`}
                      client={client}
                      index={index}
                    />
                  ))}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          <CarouselNavigation 
            onPrevious={goToPrevious}
            onNext={goToNext}
            hasMultipleClients={clients.length > 1}
          />

          <CarouselIndicators 
            clients={clients}
            currentIndex={currentIndex}
            onIndexChange={setCurrentIndex}
          />
        </div>

        {/* Decorative elements */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-[#efc349]/5 rounded-full blur-xl"></div>
        <div className="absolute bottom-20 right-10 w-32 h-32 bg-[#efc349]/5 rounded-full blur-xl"></div>
      </div>
    </section>
  );
};

export default HomeCarousel;
