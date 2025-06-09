
import { motion } from "framer-motion";
import { useCarouselData } from "./hooks/useCarouselData";
import { useCarouselAnimation } from "./hooks/useCarouselAnimation";
import CarouselCard from "./components/CarouselCard";

const HomeCarousel = () => {
  const { clients } = useCarouselData();
  const { isPaused, setIsPaused } = useCarouselAnimation({ clientsLength: clients.length });

  if (clients.length === 0) return null;

  // Duplicar clientes para rolagem infinita
  const duplicatedClients = [...clients, ...clients, ...clients];

  return (
    <section className="relative w-full py-24 bg-[#FFF1DE] dark:bg-[#020817]" id="clientes">
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
            <h2 className="text-4xl lg:text-5xl font-extralight text-[#020817] dark:text-white mb-6 leading-tight">
              Clientes que <span className="text-[#efc349]">Confiam</span>
            </h2>
            <p className="text-[#020817]/70 dark:text-white/70 font-extralight max-w-3xl mx-auto leading-relaxed text-lg">
              Empresas de diversos segmentos que escolheram nossa expertise em gestão contábil e empresarial
            </p>
          </motion.div>
        </div>

        <div className="relative max-w-7xl mx-auto overflow-hidden">
          <div 
            className="relative"
            onMouseEnter={() => setIsPaused(true)} 
            onMouseLeave={() => setIsPaused(false)}
          >
            <motion.div
              className="flex gap-6"
              animate={{
                x: isPaused ? undefined : [0, -((clients.length * 300) + (clients.length * 24))]
              }}
              transition={{
                x: {
                  repeat: Infinity,
                  repeatType: "loop",
                  duration: clients.length * 4,
                  ease: "linear"
                }
              }}
              style={{
                width: `${duplicatedClients.length * 300 + duplicatedClients.length * 24}px`
              }}
            >
              {duplicatedClients.map((client, index) => (
                <div key={`${client.id}-${index}`} className="w-72 flex-shrink-0">
                  <CarouselCard client={client} index={0} />
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HomeCarousel;
