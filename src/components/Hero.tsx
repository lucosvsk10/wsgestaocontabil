
import { useEffect, useRef } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

const Hero = () => {
  const heroRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  
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
  
  return <section id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden py-0 bg-white dark:bg-navy-dark">
      
      <div ref={heroRef} className={`container relative z-5 transition-all duration-700 transform opacity-0 translate-y-0 flex items-center justify-center ${isMobile ? 'mt-[2px]' : 'my-[50px]'} px-[10px]`}>
        <div className={`border overflow-hidden backdrop-blur-sm p-8 md:p-12 border-[5px] border-[#efc349] rounded-2xl py-[30px] my-0 mx-0 ${isMobile ? 'max-w-full aspect-[4/5] min-h-[700px]' : 'max-w-5xl aspect-[16/9]'} px-[30px]`}>
          <div className="flex flex-col md:flex-row items-center justify-between gap-12 h-full">
            <div className="w-full md:w-3/5 space-y-6 animate-fade-in-right">
              <h1 className={`font-prompt uppercase tracking-tight leading-tight py-0 my-0 text-[#46413d] dark:text-gold text-left font-medium mx-0 px-0 ${isMobile ? 'text-4xl' : 'text-5xl'}`}>
                WS Gestão Contábil
              </h1>
              
              <div className="space-y-4">
                <h2 className={`${isMobile ? 'text-lg' : 'text-xl md:text-2xl'} font-prompt font-normal text-left px-0 mx-0 text-gold-dark dark:text-gold-light py-[10px]`}>
                  Seja Bem Vindo ao Site Oficial da WS Gestão Contábil
                </h2>
                <a href="https://g.co/kgs/TNVzPqy" target="_blank" rel="noopener noreferrer" className="text-xs md:text-sm text-navy/80 dark:text-white/80 font-prompt">
                  Quem Somos
                </a>
              </div>
            </div>
            
            <div className="w-full md:w-2/5 flex justify-center animate-fade-in">
              <div className="flex flex-col items-center">
                <div className={`${isMobile ? 'w-36 h-36' : 'w-48 h-48 md:w-56 md:h-56'} flex items-center justify-center`}>
                  <img src="/lovable-uploads/a87b6e5f-5e26-4b01-bf74-865e0ec514a7.png" alt="Caduceu - Símbolo da Contabilidade" className="w-full h-full object-contain" />
                </div>
                <div className="text-center mt-4">
                  <h3 className="font-prompt font-normal px-0 mx-0 text-gold-dark text-center py-0">Caduceu</h3>
                  <p className={`${isMobile ? 'text-xs' : 'text-xs md:text-sm'} text-navy/80 dark:text-white/80 font-prompt`}>
                    O Símbolo da Profissão Contábil: Caduceu é um símbolo antigo composto por um bastão entrelaçado com duas serpentes, duas pequenas asas e um elmo.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>;
};
export default Hero;
