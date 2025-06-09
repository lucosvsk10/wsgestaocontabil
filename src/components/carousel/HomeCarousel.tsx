
import { useState, useEffect } from "react";
import { Instagram, ExternalLink } from "lucide-react";

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

  useEffect(() => {
    // Carregar clientes do localStorage
    const loadClients = () => {
      const stored = localStorage.getItem('carousel_clients');
      if (stored) {
        const allClients = JSON.parse(stored);
        const activeClients = allClients.filter((client: ClientItem) => client.active);
        setClients(activeClients.sort((a, b) => a.order_index - b.order_index));
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

  // Auto-scroll do carrossel
  useEffect(() => {
    if (clients.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => {
        // No desktop, move 1 item por vez
        // No mobile, move 1 item por vez também
        return (prevIndex + 1) % clients.length;
      });
    }, 3000); // Troca a cada 3 segundos

    return () => clearInterval(interval);
  }, [clients.length]);

  if (clients.length === 0) return null;

  // Duplicar clientes para loop infinito suave
  const extendedClients = [...clients, ...clients, ...clients];

  return (
    <section className="relative w-full py-24 bg-[#FFF1DE] dark:bg-gradient-to-b dark:from-[#020817] dark:via-[#0b1320] dark:to-[#020817]" id="clientes">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-2 bg-[#efc349]/10 border border-[#efc349]/20 rounded-full text-[#efc349] text-sm font-light mb-4">
            Nossos Parceiros
          </span>
          <h2 className="text-5xl font-extralight text-[#020817] dark:text-white mb-6 leading-tight md:text-4xl">
            Clientes que <span className="text-[#efc349]">Confiam</span>
          </h2>
          <p className="text-[#020817]/70 dark:text-white/70 font-extralight max-w-3xl mx-auto leading-relaxed text-lg">
            Empresas de diversos segmentos que escolheram nossa expertise em gestão contábil e empresarial
          </p>
        </div>

        {/* Carousel Container */}
        <div className="relative max-w-7xl mx-auto overflow-hidden">
          <div 
            className="flex transition-transform duration-500 ease-in-out"
            style={{
              transform: `translateX(-${(currentIndex * 100) / 4}%)`,
              width: `${(extendedClients.length * 100) / 4}%`
            }}
          >
            {extendedClients.map((client, index) => (
              <div 
                key={`${client.id}-${Math.floor(index / clients.length)}`}
                className="w-full px-2 sm:px-3 lg:px-4"
                style={{ flex: `0 0 ${100/4}%` }} // 4 itens no desktop
              >
                <div className="bg-white dark:bg-[#0b1320] rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-[#efc349]/20 h-full flex flex-col justify-between min-h-[280px] transition-all duration-300 hover:shadow-xl hover:scale-[1.02]">
                  {/* Logo Container */}
                  <div className="flex items-center justify-center mb-6 h-24">
                    <img 
                      src={client.logo_url} 
                      alt={client.name} 
                      className="max-h-20 max-w-full w-auto object-contain" 
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/placeholder.svg";
                      }} 
                    />
                  </div>
                  
                  {/* Client Name */}
                  <h3 className="text-lg font-light text-[#020817] dark:text-white text-center mb-4 line-clamp-2 flex-grow">
                    {client.name}
                  </h3>
                  
                  {/* Instagram Link */}
                  {client.instagram_url && (
                    <div className="flex justify-center mt-auto">
                      <a 
                        href={client.instagram_url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="inline-flex items-center space-x-2 px-4 py-2 bg-[#efc349]/10 hover:bg-[#efc349]/20 border border-[#efc349]/30 rounded-full text-[#efc349] hover:text-[#020817] dark:hover:text-[#020817] transition-all duration-300 text-sm font-light"
                      >
                        <Instagram className="w-4 h-4" />
                        <span>Instagram</span>
                        <ExternalLink className="w-3 h-3 opacity-60" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Responsive Mobile Version */}
        <div className="block lg:hidden relative max-w-7xl mx-auto overflow-hidden mt-8">
          <div 
            className="flex transition-transform duration-500 ease-in-out"
            style={{
              transform: `translateX(-${(currentIndex * 100) / 2}%)`,
              width: `${(extendedClients.length * 100) / 2}%`
            }}
          >
            {extendedClients.map((client, index) => (
              <div 
                key={`mobile-${client.id}-${Math.floor(index / clients.length)}`}
                className="w-full px-2"
                style={{ flex: `0 0 ${100/2}%` }} // 2 itens no mobile
              >
                <div className="bg-white dark:bg-[#0b1320] rounded-2xl p-4 shadow-lg border border-gray-200 dark:border-[#efc349]/20 h-full flex flex-col justify-between min-h-[240px] transition-all duration-300 hover:shadow-xl">
                  {/* Logo Container */}
                  <div className="flex items-center justify-center mb-4 h-16">
                    <img 
                      src={client.logo_url} 
                      alt={client.name} 
                      className="max-h-14 max-w-full w-auto object-contain" 
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/placeholder.svg";
                      }} 
                    />
                  </div>
                  
                  {/* Client Name */}
                  <h3 className="text-base font-light text-[#020817] dark:text-white text-center mb-3 line-clamp-2 flex-grow">
                    {client.name}
                  </h3>
                  
                  {/* Instagram Link */}
                  {client.instagram_url && (
                    <div className="flex justify-center mt-auto">
                      <a 
                        href={client.instagram_url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="inline-flex items-center space-x-1 px-3 py-1.5 bg-[#efc349]/10 hover:bg-[#efc349]/20 border border-[#efc349]/30 rounded-full text-[#efc349] hover:text-[#020817] dark:hover:text-[#020817] transition-all duration-300 text-xs font-light"
                      >
                        <Instagram className="w-3 h-3" />
                        <span>Instagram</span>
                        <ExternalLink className="w-2 h-2 opacity-60" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Indicators */}
        <div className="flex justify-center mt-8 space-x-2">
          {clients.map((_, index) => (
            <button
              key={index}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentIndex % clients.length
                  ? 'bg-[#efc349] w-6'
                  : 'bg-[#efc349]/30'
              }`}
              onClick={() => setCurrentIndex(index)}
            />
          ))}
        </div>

        {/* Decorative elements */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-[#efc349]/5 rounded-full blur-xl"></div>
        <div className="absolute bottom-20 right-10 w-32 h-32 bg-[#efc349]/5 rounded-full blur-xl"></div>
      </div>
    </section>
  );
};

export default HomeCarousel;
