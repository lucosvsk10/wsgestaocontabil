
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Calculator, ChevronUp } from "lucide-react";

interface FloatingToolsMenuProps {
  className?: string;
}

const FloatingToolsMenu = ({
  className
}: FloatingToolsMenuProps) => {
  const scrollToFerramentas = () => {
    const ferramentasSection = document.getElementById('ferramentas');
    if (ferramentasSection) {
      ferramentasSection.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }
  };

  return (
    <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
      <Button 
        size="icon" 
        className="h-14 w-14 rounded-full bg-[#efc349] hover:bg-[#efc349]/90 text-[#020817] shadow-lg animate-bounce" 
        onClick={scrollToFerramentas} 
        aria-label="Ir para Ferramentas"
      >
        <Calculator size={24} />
      </Button>
    </div>
  );
};

export default FloatingToolsMenu;
