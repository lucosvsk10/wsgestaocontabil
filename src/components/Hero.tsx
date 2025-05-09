import { useEffect, useRef } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
const Hero = () => {
  const heroRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const {
    theme
  } = useTheme();
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
  return <section id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden py-12 bg-white dark:bg-navy-dark">
      <div ref={heroRef} className="container relative z-5 transition-all duration-700 transform opacity-0 translate-y-0 flex items-center justify-center my-8 px-4">
        <div className={cn("overflow-hidden backdrop-blur-sm rounded-2xl shadow-md border", "py-10 md:py-16 px-6 md:px-10 max-w-7xl w-full", theme === 'light' ? "bg-white/90 border-gray-200/80 shadow-gray-200/50" : "bg-navy-light/40 border-navy-lighter/30 shadow-black/20")}>
          {/* Grid container */}
          <div className={cn("grid gap-10 md:gap-16", isMobile ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2")}>
            {/* Left column - Text content */}
            <div className="flex flex-col justify-center space-y-6">
              <div className="space-y-4">
                <h1 className="text-5xl font-normal">
                  WS Gestão Contábil
                </h1>
                
                <h2 className={cn("font-prompt", "text-xl md:text-2xl", "text-navy-light/90 dark:text-gold-light/90")}>
                  Transformando a contabilidade com tecnologia e confiança.
                </h2>
                
                <p className={cn("text-navy/80 dark:text-white/70", "text-base md:text-lg max-w-xl")}>
                  Há mais de 15 anos oferecendo soluções contábeis inovadoras, 
                  com uma equipe especializada e comprometida com a excelência 
                  no atendimento às necessidades do seu negócio.
                </p>
              </div>
              
              <div className="pt-4">
                <Button variant="default" size={isMobile ? "default" : "lg"} className={cn("group transition-all duration-300 rounded-xl", "bg-gold hover:bg-gold-light dark:bg-gold dark:hover:bg-gold-light", "text-navy-deeper dark:text-navy-deeper")} onClick={() => {
                document.getElementById('quemsomos')?.scrollIntoView({
                  behavior: 'smooth'
                });
              }}>
                  Saiba Mais
                  <ArrowRight size={18} className="ml-1 transition-transform group-hover:translate-x-1" />
                </Button>
              </div>
            </div>
            
            {/* Right column - Caduceus symbol */}
            <div className={cn("flex flex-col items-center justify-center", isMobile ? "order-first" : "order-last")}>
              <div className={cn("rounded-full p-6 md:p-8", "flex items-center justify-center", "bg-gold/10 dark:bg-gold/20", "border border-gold/30 dark:border-gold/40", "shadow-inner shadow-gold/5 dark:shadow-gold/10", isMobile ? "w-40 h-40" : "w-56 h-56 md:w-64 md:h-64")}>
                <img src="/lovable-uploads/a87b6e5f-5e26-4b01-bf74-865e0ec514a7.png" alt="Caduceu - Símbolo da Contabilidade" className="w-full h-full object-contain p-3" />
              </div>
              
              <div className="text-center mt-6 max-w-xs">
                <h3 className="font-prompt font-medium text-navy-light dark:text-gold text-lg mb-2">
                  Símbolo Contábil
                </h3>
                <p className={cn("font-prompt text-sm", "text-navy/70 dark:text-white/70")}>
                  O Caduceu é um símbolo tradicional da profissão contábil que representa 
                  equilíbrio, ética e precisão nos registros financeiros.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>;
};
export default Hero;