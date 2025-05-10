
import { useEffect, useRef } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import WelcomeBlock from './WelcomeBlock';

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
  
  return (
    <section id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden py-0 bg-white dark:bg-navy-dark">
      <div ref={heroRef} className="container relative z-5 transition-all duration-700 transform opacity-0 translate-y-0 flex items-center justify-center my-[50px] px-[10px]">
        <div className={`border overflow-hidden backdrop-blur-sm p-8 md:p-12 border-[5px] border-[#efc349] rounded-2xl py-[30px] my-0 mx-0 ${isMobile ? 'max-w-full aspect-[4/5] min-h-[700px]' : 'max-w-5xl aspect-[16/9]'} px-[30px]`}>
          <WelcomeBlock />
        </div>
      </div>
    </section>
  );
};

export default Hero;
