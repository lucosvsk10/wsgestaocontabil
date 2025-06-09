
import { motion } from "framer-motion";
import { Instagram, ExternalLink } from "lucide-react";
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
      className="group relative"
    >
      <div className="bg-white dark:bg-[#0b1320] rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-[#efc349]/20 group h-full flex flex-col">
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
  );
};

export default CarouselCard;
