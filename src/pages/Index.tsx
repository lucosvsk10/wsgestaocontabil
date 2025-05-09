import { useEffect } from 'react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import About from '../components/About';
import BusinessNews from '../components/BusinessNews';
import AccountingSection from '../components/accounting/AccountingSection';
import Footer from '../components/Footer';
import { PollWidget } from "@/components/polls/PollWidget";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import FloatingToolsMenu from '@/components/accounting/FloatingToolsMenu';
const Index = () => {
  useEffect(() => {
    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    };
    const observer = new IntersectionObserver(handleIntersection, {
      root: null,
      rootMargin: '0px',
      threshold: 0.1
    });
    const fadeElements = document.querySelectorAll('.fadein-on-scroll');
    fadeElements.forEach(element => {
      observer.observe(element);
    });
    return () => {
      fadeElements.forEach(element => {
        observer.unobserve(element);
      });
    };
  }, []);
  const scrollToContabil = () => {
    const contabilSection = document.getElementById('contabil');
    if (contabilSection) {
      contabilSection.scrollIntoView({
        behavior: 'smooth'
      });
    }
  };
  return <div className="relative min-h-screen px:6 bg-white dark:bg-navy-dark">
      <Navbar />
      <main>
        <Hero />
        <About />
        <BusinessNews />
        <AccountingSection />
      </main>
      <Footer />
      
      {/* Poll Widget */}
      <PollWidget />
      
      {/* Fixed navigation dots */}
      <div className="fixed right-6 top-1/2 transform -translate-y-1/2 z-40 hidden lg:block">
        <div className="flex flex-col space-y-4">
          <a href="#hero" className="w-3 h-3 rounded-full bg-gold/30 hover:bg-gold transition-colors duration-300" aria-label="Ir para o topo" />
          <a href="#servicos" className="w-3 h-3 rounded-full bg-gold/30 hover:bg-gold transition-colors duration-300" aria-label="Ir para serviços" />
          <a href="#sobre" className="w-3 h-3 rounded-full bg-gold/30 hover:bg-gold transition-colors duration-300" aria-label="Ir para sobre" />
          <a href="#noticias" className="w-3 h-3 rounded-full bg-gold/30 hover:bg-gold transition-colors duration-300" aria-label="Ir para notícias" />
          <a href="#contabil" className="w-3 h-3 rounded-full bg-gold/30 hover:bg-gold transition-colors duration-300" aria-label="Ir para contábil" />
          <a href="#contato" className="w-3 h-3 rounded-full bg-gold/30 hover:bg-gold transition-colors duration-300" aria-label="Ir para contato" />
        </div>
      </div>
      
      {/* Floating Tools Menu */}
      <FloatingToolsMenu />
      
      {/* Floating Button for News Section */}
      <div className="fixed right-6 bottom-24 z-40">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              
            </TooltipTrigger>
            <TooltipContent>
              <p>Últimas Notícias</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>;
};
export default Index;