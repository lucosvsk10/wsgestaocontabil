import { useEffect, useRef } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Building, FileHeart, Users, FileText } from 'lucide-react';
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
  return <section id="hero" className="relative min-h-[100vh] flex items-center justify-center overflow-hidden bg-background py-[80px]">
      <div ref={heroRef} className="container relative z-5 transition-all duration-700 transform opacity-0 translate-y-10 my-px py-[4px] mx-0 px-[20px]">
        <div className="flex justify-center items-center">
          <div className="grid md:grid-cols-2 items-center gap-4 my-0 -mt-4 px-[150px] mx-auto py-[8px]">
            {/* Left column - Content */}
            <div className="flex flex-col">
              <h1 className="text-5xl md:text-6xl font-extrabold text-primary">
                WS GESTÃO CONTÁBIL
              </h1>
              
              <p className="text-base mt-2 leading-relaxed font-thin text-[#46413d] dark:text-gold-dark">
                Soluções eficientes e personalizadas para sua empresa prosperar
              </p>
              
              {/* Feature highlights with icons */}
              <div className="flex flex-col gap-2 mt-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-primary/10 p-1.5 rounded-full text-primary w-8 h-8 flex items-center justify-center">
                    <Building className="h-4 w-4" />
                  </div>
                  <span className="text-xs md:text-sm font-medium text-foreground">ABERTURA, ALTERAÇÃO E BAIXA DE EMPRESAS</span>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="bg-primary/10 p-1.5 rounded-full text-primary w-8 h-8 flex items-center justify-center">
                    <FileHeart className="h-4 w-4" />
                  </div>
                  <span className="text-xs md:text-sm font-medium text-foreground">PLANEJAMENTO TRIBUTÁRIO INTELIGENTE</span>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="bg-primary/10 p-1.5 rounded-full text-primary w-8 h-8 flex items-center justify-center">
                    <Users className="h-4 w-4" />
                  </div>
                  <span className="text-xs md:text-sm font-medium text-foreground">GESTÃO EMPRESARIAL</span>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="bg-primary/10 p-1.5 rounded-full text-primary w-8 h-8 flex items-center justify-center">
                    <FileText className="h-4 w-4" />
                  </div>
                  <span className="text-xs md:text-sm font-medium text-foreground">ASSESSORIA TRABALHISTA</span>
                </div>
              </div>
              
              {/* CTA Buttons */}
              <div className="flex flex-wrap gap-3 mt-7">
                <Button className="bg-primary text-white px-4 py-1.5 text-sm rounded-xl font-semibold hover:opacity-90" onClick={() => window.open('https://g.co/kgs/d2UwXh3', '_blank')}>
                  Saiba Mais
                </Button>
                
                <Button variant="outline" className="border border-primary text-primary px-4 py-1.5 text-sm rounded-xl hover:bg-primary/10" onClick={() => window.open('https://wa.me/5582999324884', '_blank')}>
                  Fale com um especialista
                </Button>
              </div>
            </div>
            
            {/* Right column - Visual element */}
            <div className="flex flex-col items-center justify-center w-[90%]">
              <div className="flex flex-col items-center bg-inherit max-w-[250px] md:max-w-[300px]">
                <div className="w-[70%] md:w-[80%]">
                  <img src={theme === 'light' ? "/lovable-uploads/99f722e6-cc97-4cb4-8141-6a28a446db88.png" : "/lovable-uploads/1eaf9486-7e70-4235-adbf-53d8043d5b91.png"} alt="Símbolo da Contabilidade" className="w-full h-full object-contain animate-fade-in" />
                </div>
                <p className="text-xs text-muted-foreground mt-2 text-center italic px-[20px]">
                  O caduceu é um símbolo da contabilidade, representando a sabedoria, o conhecimento e a proteção do comércio e das riquezas, características do profissional contábil.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>;
};
export default Hero;