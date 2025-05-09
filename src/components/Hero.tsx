
import { useEffect, useRef } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ArrowRight, BarChart3, Shield, Users } from 'lucide-react';

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
    <section id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden py-12 bg-background">
      <div 
        ref={heroRef} 
        className="container relative z-5 transition-all duration-700 transform opacity-0 translate-y-10 my-8 px-4"
      >
        <div 
          className={cn(
            "overflow-hidden backdrop-blur-sm rounded-2xl shadow-md border max-w-7xl mx-auto",
            "py-12 md:py-16 px-6 md:px-10 w-full",
            theme === 'light' 
              ? "bg-white/90 border-gray-200/80 shadow-gray-200/50" 
              : "bg-navy-light/30 border-navy-lighter/30 shadow-black/20"
          )}
        >
          {/* Grid layout - two columns on desktop, stacked on mobile */}
          <div className="grid gap-8 md:gap-12 lg:gap-16 grid-cols-1 lg:grid-cols-2">
            
            {/* Left column - Content and CTA */}
            <div className={cn(
              "flex flex-col justify-center space-y-8",
              isMobile && "text-center"
            )}>
              <div className="space-y-4">
                <h1 className={cn(
                  "text-4xl md:text-5xl font-extrabold tracking-tight",
                  "bg-gradient-to-r",
                  theme === 'light'
                    ? "from-gold via-gold-dark to-gold text-transparent bg-clip-text"
                    : "from-gold-light via-gold to-gold-dark text-transparent bg-clip-text"
                )}>
                  Bem-vindo à WS GESTÃO CONTÁBIL
                </h1>
                
                <h2 className={cn(
                  "text-xl md:text-2xl mt-3",
                  "text-foreground/90",
                  "font-prompt"
                )}>
                  Soluções contábeis modernas para transformar sua empresa
                </h2>
              </div>
              
              {/* Feature highlights with icons */}
              <div className={cn(
                "grid grid-cols-1 md:grid-cols-3 gap-4",
                isMobile && "place-items-center"
              )}>
                <div className={cn(
                  "flex items-center space-x-3",
                  isMobile && "justify-center"
                )}>
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center">
                    <BarChart3 className="h-5 w-5 text-gold" />
                  </div>
                  <span className="text-foreground/80">Relatórios automatizados</span>
                </div>
                
                <div className={cn(
                  "flex items-center space-x-3",
                  isMobile && "justify-center"
                )}>
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-gold" />
                  </div>
                  <span className="text-foreground/80">Segurança de dados garantida</span>
                </div>
                
                <div className={cn(
                  "flex items-center space-x-3",
                  isMobile && "justify-center"
                )}>
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center">
                    <Users className="h-5 w-5 text-gold" />
                  </div>
                  <span className="text-foreground/80">Atendimento personalizado</span>
                </div>
              </div>
              
              {/* CTA Buttons */}
              <div className={cn(
                "flex gap-4 mt-4 pt-4",
                isMobile ? "flex-col" : "flex-row"
              )}>
                <Button 
                  className={cn(
                    "transition-all duration-300 rounded-xl",
                    "bg-gold hover:bg-gold-light text-navy-deeper",
                    "text-base px-6 py-2 font-medium",
                    isMobile && "w-full"
                  )}
                  onClick={() => {
                    document.getElementById('quemsomos')?.scrollIntoView({
                      behavior: 'smooth'
                    });
                  }}
                >
                  Saiba Mais
                  <ArrowRight size={18} className="ml-1.5" />
                </Button>
                
                <Button 
                  className={cn(
                    "transition-all duration-300 rounded-xl",
                    "bg-transparent border border-gold text-gold hover:bg-gold/10",
                    "text-base px-6 py-2 font-medium",
                    isMobile && "w-full"
                  )}
                  onClick={() => {
                    document.getElementById('contato')?.scrollIntoView({
                      behavior: 'smooth'
                    });
                  }}
                >
                  Fale Conosco
                </Button>
              </div>
            </div>
            
            {/* Right column - Illustration and quote */}
            <div className={cn(
              "flex flex-col items-center justify-center",
              isMobile ? "order-first mb-6" : "order-last"
            )}>
              <div className={cn(
                "rounded-full p-8 md:p-10",
                "flex items-center justify-center max-w-[320px]",
                "bg-gold/10 dark:bg-gold/15",
                "border border-gold/30 dark:border-gold/25",
                "shadow-inner shadow-gold/5 dark:shadow-gold/10"
              )}>
                <img 
                  src="/lovable-uploads/a87b6e5f-5e26-4b01-bf74-865e0ec514a7.png" 
                  alt="Símbolo da Contabilidade" 
                  className="w-full h-full object-contain animate-fade-in"
                />
              </div>
              
              {/* Quote */}
              <div className="text-center mt-8 max-w-sm mx-auto">
                <blockquote className={cn(
                  "text-lg italic font-prompt",
                  "text-gold dark:text-gold-light"
                )}>
                  "A contabilidade não é apenas números, é estratégia para crescer com segurança."
                </blockquote>
                <div className="mt-2 text-sm text-muted-foreground">
                  — Equipe WS Contábil
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
