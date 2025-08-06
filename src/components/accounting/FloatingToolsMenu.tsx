
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Calculator } from "lucide-react";

interface FloatingToolsMenuProps {
  className?: string;
}

const FloatingToolsMenu = ({
  className
}: FloatingToolsMenuProps) => {
  const [isToolsSectionVisible, setIsToolsSectionVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [isEntering, setIsEntering] = useState(false);

  useEffect(() => {
    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      entries.forEach(entry => {
        if (entry.target.id === 'ferramentas') {
          if (entry.isIntersecting && !isToolsSectionVisible) {
            setIsExiting(true);
            setTimeout(() => {
              setIsToolsSectionVisible(true);
            }, 300);
          } else if (!entry.isIntersecting && isToolsSectionVisible) {
            setIsEntering(true);
            setTimeout(() => {
              setIsToolsSectionVisible(false);
              setIsExiting(false);
            }, 100);
          }
        }
      });
    };

    const observer = new IntersectionObserver(handleIntersection, {
      root: null,
      rootMargin: '0px',
      threshold: 0.1
    });

    const ferramentasSection = document.getElementById('ferramentas');
    if (ferramentasSection) {
      observer.observe(ferramentasSection);
    }

    return () => {
      if (ferramentasSection) {
        observer.unobserve(ferramentasSection);
      }
    };
  }, [isToolsSectionVisible]);

  const scrollToFerramentas = () => {
    const ferramentasSection = document.getElementById('ferramentas');
    if (ferramentasSection) {
      ferramentasSection.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }
  };

  // Não renderizar se a seção ferramentas estiver visível
  if (isToolsSectionVisible) {
    return null;
  }

  return (
    <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
      <Button 
        size="icon" 
        className={`h-14 w-14 rounded-full bg-yellow-400 hover:bg-yellow-500 text-slate-900 shadow-lg transition-all duration-300 ${
          isExiting 
            ? 'animate-[bubble-pop_0.3s_ease-in_forwards]' 
            : isEntering
            ? 'animate-[bubble-in_0.4s_ease-out_forwards]'
            : 'animate-bounce hover:animate-none'
        }`}
        onClick={scrollToFerramentas} 
        aria-label="Ir para Ferramentas"
      >
        <Calculator size={24} />
      </Button>
    </div>
  );
};

export default FloatingToolsMenu;
