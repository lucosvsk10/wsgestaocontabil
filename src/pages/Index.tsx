import { useEffect } from 'react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import About from '../components/About';
import Footer from '../components/Footer';
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
  return <div className="relative min-h-screen px:6 bg-gray-950">
      <Navbar />
      <main>
        <Hero />
        <About />
      </main>
      <Footer />
      
      {/* Fixed navigation dots */}
      <div className="fixed right-6 top-1/2 transform -translate-y-1/2 z-40 hidden lg:block">
        <div className="flex flex-col space-y-4">
          <a href="#hero" className="w-3 h-3 rounded-full bg-gold/30 hover:bg-gold transition-colors duration-300" aria-label="Ir para o topo" />
          <a href="#servicos" className="w-3 h-3 rounded-full bg-gold/30 hover:bg-gold transition-colors duration-300" aria-label="Ir para serviços" />
          <a href="#sobre" className="w-3 h-3 rounded-full bg-gold/30 hover:bg-gold transition-colors duration-300" aria-label="Ir para sobre" />
          <a href="#contato" className="w-3 h-3 rounded-full bg-gold/30 hover:bg-gold transition-colors duration-300" aria-label="Ir para contato" />
        </div>
      </div>
    </div>;
};
export default Index;