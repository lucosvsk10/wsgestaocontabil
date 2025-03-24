
import { useEffect, useRef } from 'react';

const Hero = () => {
  const heroRef = useRef<HTMLDivElement>(null);

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

  return <section id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden bg-navy py-0">
      
      <div ref={heroRef} className="container relative z-5 transition-all duration-700 transform opacity-0 translate-y-0 flex items-center justify-center">
        <div className="border overflow-hidden backdrop-blur-sm p-8 md:p-12 border-[5px] border-[#efc349] rounded-2xl py-[30px] my-0 mx-0 px-[50px] max-w-5xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-12">
            <div className="w-full md:w-3/5 space-y-6 animate-fade-in-right">
              <h1 className="text-4xl md:text-6xl font-anton text-gold uppercase tracking-tight leading-tight">
                WS Gestão Contábil
              </h1>
              
              <div className="space-y-4">
                <h2 className="text-xl md:text-2xl font-medium text-white font-prompt">
                  Seja Bem Vindo ao Site Oficial da WS Gestão Contábil
                </h2>
                <a href="#quem-somos" className="inline-block text-purple hover:text-purple-400 font-prompt font-medium transition-colors duration-300">
                  Quem Somos
                </a>
              </div>
            </div>
            
            <div className="w-full md:w-2/5 flex justify-center animate-fade-in">
              <div className="flex flex-col items-center">
                <div className="w-48 h-48 md:w-56 md:h-56 flex items-center justify-center">
                  <img 
                    src="/lovable-uploads/a87b6e5f-5e26-4b01-bf74-865e0ec514a7.png" 
                    alt="Caduceu - Símbolo da Contabilidade" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="text-center mt-4">
                  <h3 className="text-lg font-anton text-gold mb-2">Caduceu</h3>
                  <p className="text-xs md:text-sm text-white/80 font-prompt">
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
