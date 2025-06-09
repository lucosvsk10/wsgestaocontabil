
import { useState, useEffect } from "react";
import { Instagram, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

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

  if (clients.length === 0) return null;

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
          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-2 md:-ml-4">
              {clients.map((client) => (
                <CarouselItem key={client.id} className="pl-2 md:pl-4 basis-full sm:basis-1/2 lg:basis-1/4">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="group relative h-full"
                  >
                    <div className="bg-white dark:bg-[#0b1320] rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-[#efc349]/20 h-full flex flex-col">
                      {/* Logo */}
                      <div className="relative mb-6 flex-1 flex items-center justify-center w-full min-h-[80px]">
                        <img 
                          src={client.logo_url} 
                          alt={client.name} 
                          className="max-h-20 max-w-32 w-auto object-contain transition-all duration-300" 
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
                        <div className="flex justify-center">
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
                        </div>
                      )}
                    </div>
                  </motion.div>
                </CarouselItem>
              ))}
            </CarouselContent>
            
            {/* Navigation arrows - only show if we have more than 4 clients */}
            {clients.length > 4 && (
              <>
                <CarouselPrevious className="absolute -left-4 lg:-left-12 top-1/2 -translate-y-1/2 bg-white dark:bg-[#efc349]/20 hover:bg-gray-50 dark:hover:bg-[#efc349]/40 backdrop-blur-sm border border-gray-200/20 dark:border-[#efc349]/30 text-[#020817] dark:text-[#efc349] hover:text-[#efc349] dark:hover:text-white" />
                <CarouselNext className="absolute -right-4 lg:-right-12 top-1/2 -translate-y-1/2 bg-white dark:bg-[#efc349]/20 hover:bg-gray-50 dark:hover:bg-[#efc349]/40 backdrop-blur-sm border border-gray-200/20 dark:border-[#efc349]/30 text-[#020817] dark:text-[#efc349] hover:text-[#efc349] dark:hover:text-white" />
              </>
            )}
          </Carousel>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-[#efc349]/5 rounded-full blur-xl"></div>
        <div className="absolute bottom-20 right-10 w-32 h-32 bg-[#efc349]/5 rounded-full blur-xl"></div>
      </div>
    </section>
  );
};

export default HomeCarousel;
