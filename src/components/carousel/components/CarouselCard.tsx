
import React from "react";
import { motion } from "framer-motion";
import { Instagram, MessageCircle } from "lucide-react";
import { ClientItem } from "../types";

interface CarouselCardProps {
  client: ClientItem;
  index: number;
}

// Memoizar o componente para evitar re-renders desnecessários
const CarouselCard = React.memo(({ client, index }: CarouselCardProps) => {
  // Memoizar handlers para evitar recriação em cada render
  const handleImageError = React.useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    (e.target as HTMLImageElement).src = "/logo-padrao.png";
  }, []);

  // Memoizar os links sociais para evitar recálculo
  const socialLinks = React.useMemo(() => {
    const links = [];
    
    if (client.instagram_url) {
      links.push({
        href: client.instagram_url,
        icon: Instagram,
        title: "Instagram",
        key: "instagram"
      });
    }
    
    if (client.whatsapp_url) {
      links.push({
        href: client.whatsapp_url,
        icon: MessageCircle,
        title: "WhatsApp",
        key: "whatsapp"
      });
    }
    
    return links;
  }, [client.instagram_url, client.whatsapp_url]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.4, 
        delay: index * 0.1 
      }}
      className="group relative h-full"
    >
      <div className="bg-white dark:bg-[#020817] rounded-lg p-6 shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100 dark:border-[#efc349]/30 h-full flex flex-col">
        {/* Logo - tamanho aumentado */}
        <div className="relative mb-4 flex-1 flex items-center justify-center w-full min-h-[128px]">
          <img 
            src={client.logo_url} 
            alt={client.name} 
            className="max-h-32 max-w-full w-auto object-contain transition-all duration-300" 
            onError={handleImageError}
            loading="lazy"
          />
        </div>
        
        {/* Nome da empresa */}
        <h3 className="text-lg font-medium text-[#020817] dark:text-white text-center mb-4 line-clamp-2">
          {client.name}
        </h3>
        
        {/* Links sociais */}
        {socialLinks.length > 0 && (
          <div className="flex justify-center gap-3">
            {socialLinks.map(({ href, icon: Icon, title, key }) => (
              <a 
                key={key}
                href={href} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="inline-flex items-center justify-center w-10 h-10 bg-[#efc349]/10 hover:bg-[#efc349]/20 border border-[#efc349]/30 hover:border-[#efc349] rounded-full text-[#efc349] transition-all duration-300 group/link"
                title={title}
              >
                <Icon className="w-4 h-4" />
              </a>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
});

CarouselCard.displayName = "CarouselCard";

export default CarouselCard;
