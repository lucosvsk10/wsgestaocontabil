
import { motion } from "framer-motion";
import { Instagram, MessageCircle } from "lucide-react";
import { ClientItem } from "../types";

interface CarouselCardProps {
  client: ClientItem;
  index: number;
}

const CarouselCard = ({ client, index }: CarouselCardProps) => {
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
        {/* Logo */}
        <div className="relative mb-4 flex-1 flex items-center justify-center w-full min-h-[80px]">
          <img 
            src={client.logo_url} 
            alt={client.name} 
            className="max-h-20 max-w-full w-auto object-contain transition-all duration-300" 
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/placeholder.svg";
            }} 
          />
        </div>
        
        {/* Nome da empresa */}
        <h3 className="text-lg font-medium text-[#020817] dark:text-white text-center mb-4 line-clamp-2">
          {client.name}
        </h3>
        
        {/* Links sociais */}
        {(client.instagram_url || client.whatsapp_url) && (
          <div className="flex justify-center gap-3">
            {client.instagram_url && (
              <a 
                href={client.instagram_url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="inline-flex items-center justify-center w-10 h-10 bg-[#efc349]/10 hover:bg-[#efc349]/20 border border-[#efc349]/30 hover:border-[#efc349] rounded-full text-[#efc349] transition-all duration-300 group/link"
                title="Instagram"
              >
                <Instagram className="w-4 h-4" />
              </a>
            )}
            
            {client.whatsapp_url && (
              <a 
                href={client.whatsapp_url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="inline-flex items-center justify-center w-10 h-10 bg-[#efc349]/10 hover:bg-[#efc349]/20 border border-[#efc349]/30 hover:border-[#efc349] rounded-full text-[#efc349] transition-all duration-300 group/link"
                title="WhatsApp"
              >
                <MessageCircle className="w-4 h-4" />
              </a>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default CarouselCard;
