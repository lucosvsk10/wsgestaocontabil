import { useEffect, useRef } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { BarChart3, FileText, Users } from 'lucide-react';
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
  return <section id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden py-12 bg-background">
      <div ref={heroRef} className="container relative z-5 transition-all duration-700 transform opacity-0 translate-y-10 my-px py-[10px] mx-0 px-[45px]">
        <div className="flex justify-center items-center">
          <div className="grid md:grid-cols-2 items-center gap-10 mx-[10px] py-0 my-0 px-[10px] -mt-10">
            {/* Left column - Content */}
            <div className="flex flex-col">
              <h1 className="text-4xl md:text-5xl font-extrabold text-primary">
                WS GESTÃO CONTÁBIL
              </h1>
              
              <p className="text-lg mt-4 leading-relaxed font-thin text-gold-dark">
                Soluções eficientes e personalizadas para sua empresa prosperar
              </p>
              
              {/* Feature highlights with icons */}
              <div className="flex flex-col gap-3 mt-6">
                <div className="flex items-center space-x-3">
                  <div className="bg-primary/10 p-2 rounded-full text-primary w-10 h-10 flex items-center justify-center">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                  <span className="text-sm md:text-base font-medium text-foreground">Planejamento tributário inteligente</span>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="bg-primary/10 p-2 rounded-full text-primary w-10 h-10 flex items-center justify-center">
                    <FileText className="h-5 w-5" />
                  </div>
                  <span className="text-sm md:text-base font-medium text-foreground">Documentos sempre disponíveis</span>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="bg-primary/10 p-2 rounded-full text-primary w-10 h-10 flex items-center justify-center">
                    <Users className="h-5 w-5" />
                  </div>
                  <span className="text-sm md:text-base font-medium text-foreground">Atendimento com especialistas</span>
                </div>
              </div>
              
              {/* CTA Buttons */}
              <div className="flex flex-wrap gap-4 mt-6">
                <Button className="bg-primary text-white px-5 py-2 rounded-xl font-semibold hover:opacity-90" onClick={() => {
                document.getElementById('quemsomos')?.scrollIntoView({
                  behavior: 'smooth'
                });
              }}>
                  Saiba Mais
                </Button>
                
                <Button variant="outline" className="border border-primary text-primary px-5 py-2 rounded-xl hover:bg-primary/10" onClick={() => {
                document.getElementById('contato')?.scrollIntoView({
                  behavior: 'smooth'
                });
              }}>
                  Fale com um especialista
                </Button>
              </div>
            </div>
            
            {/* Right column - Visual element */}
            <div className="flex flex-col items-center justify-center">
              <div className="flex flex-col items-center bg-inherit">
                <div className={cn("rounded-full p-8 md:p-10", "flex items-center justify-center max-w-[320px]", "bg-primary/10", "border border-primary/20", "shadow-inner shadow-primary/5")}>
                  <img src="/lovable-uploads/a87b6e5f-5e26-4b01-bf74-865e0ec514a7.png" alt="Símbolo da Contabilidade" className="w-full h-full object-contain animate-fade-in" />
                </div>
                <p className="text-sm text-muted-foreground mt-4 text-center italic px-[100px]">
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