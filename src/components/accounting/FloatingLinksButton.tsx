
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import { LinkItem } from './types';

interface FloatingLinksButtonProps {
  links: LinkItem[];
}

const FloatingLinksButton = ({ links }: FloatingLinksButtonProps) => {
  const [isFloatingButtonOpen, setIsFloatingButtonOpen] = useState(false);

  return (
    <div className="fixed bottom-8 right-8 z-30">
      {isFloatingButtonOpen ? (
        <div className="bg-white/90 dark:bg-navy-dark border border-gold/30 rounded-lg p-4 shadow-lg mb-4 animate-fade-in">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-gold font-medium">Links Rápidos</h3>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-gold hover:bg-navy-light" 
              onClick={() => setIsFloatingButtonOpen(false)}
            >
              <X size={18} />
            </Button>
          </div>
          <div className="space-y-2">
            {links.map(link => (
              <a 
                key={link.id} 
                href={link.url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="block text-navy dark:text-white hover:text-gold transition-colors p-2 hover:bg-orange-300 dark:hover:bg-navy-light rounded"
              >
                {link.title}
              </a>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default FloatingLinksButton;
