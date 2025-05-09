
import { useEffect, useRef } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const Hero = () => {
  const heroRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const { theme } = useTheme();
  
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('opacity-100');
        entry.target.classList.remove('opacity-0', 'translate-y-10');
      }
    }, {
      threshold: 0.1
    });
    
    if (heroRef.current) {
      observer.observe(heroRef.current);
    }
    
    return () => {
      if (heroRef.current) {
        observer.unobserve(heroRef.current);
      }
    };
  }, []);
  
  return (
    <section 
      id="hero" 
      className="relative min-h-screen flex items-center justify-center overflow-hidden py-0 bg-white dark:bg-navy-dark"
    >
      <div 
        ref={heroRef} 
        className="container relative z-5 transition-all duration-700 transform opacity-0 translate-y-0 flex items-center justify-center my-[50px] px-[10px]"
      >
        <div 
          className={cn(
            "overflow-hidden backdrop-blur-sm rounded-2xl shadow-lg border",
            "py-8 md:py-12 px-6 md:px-10 max-w-7xl w-full",
            theme === 'light' 
              ? "bg-white/90 border-gray-200/80 shadow-gray-200/50" 
              : "bg-navy-light/40 border-navy-lighter/30 shadow-black/20"
          )}
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-12">
            {/* Coluna esquerda - Texto e chamada para ação */}
            <div className="w-full md:w-3/5 space-y-6 animate-fade-in-right">
              <h1 className={cn(
                "font-prompt uppercase tracking-tight leading-tight py-0 my-0",
                "text-left font-medium mx-0 px-0",
                isMobile ? "text-4xl" : "text-5xl",
                "text-navy-light dark:text-gold"
              )}>
                WS Gestão Contábil
              </h1>
              
              <div className="space-y-6">
                <h2 className={cn(
                  "font-prompt font-normal text-left px-0 mx-0 py-4",
                  isMobile ? "text-lg" : "text-xl md:text-2xl",
                  "text-navy-light dark:text-gold-light"
                )}>
                  Seja Bem Vindo ao Site Oficial da WS Gestão Contábil
                </h2>
                
                <Button 
                  variant="default" 
                  size={isMobile ? "default" : "lg"}
                  className={cn(
                    "mt-4 group transition-all duration-300",
                    "bg-gold hover:bg-gold-light dark:bg-gold dark:hover:bg-gold-light",
                    "text-navy-deeper dark:text-navy-deeper"
                  )}
                  onClick={() => {
                    document.getElementById('quemsomos')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  Quem Somos
                  <ArrowRight size={18} className="ml-1 transition-transform group-hover:translate-x-1" />
                </Button>
              </div>
            </div>
            
            {/* Coluna direita - Símbolo e explicação */}
            <div className="w-full md:w-2/5 flex flex-col items-center animate-fade-in">
              <div className={cn(
                "rounded-full p-4",
                "flex items-center justify-center",
                "bg-gold/10 dark:bg-gold/20",
                "border border-gold/30 dark:border-gold/40",
                "shadow-inner shadow-gold/5 dark:shadow-gold/10",
                isMobile ? "w-36 h-36" : "w-48 h-48 md:w-56 md:h-56"
              )}>
                <img 
                  src="/lovable-uploads/a87b6e5f-5e26-4b01-bf74-865e0ec514a7.png" 
                  alt="Caduceu - Símbolo da Contabilidade" 
                  className="w-full h-full object-contain p-3"
                />
              </div>
              
              <div className="text-center mt-6 max-w-xs">
                <h3 className="font-prompt font-medium text-navy-light dark:text-gold text-lg mb-2">
                  Caduceu
                </h3>
                <p className={cn(
                  "font-prompt",
                  isMobile ? "text-xs" : "text-sm",
                  "text-navy/70 dark:text-white/70"
                )}>
                  O Símbolo da Profissão Contábil: Caduceu é um símbolo antigo composto por um bastão entrelaçado com duas serpentes, duas pequenas asas e um elmo.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
