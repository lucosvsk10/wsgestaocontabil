import { useEffect } from 'react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import About from '../components/About';
import BusinessNews from '../components/BusinessNews';
import AccountingSection from '../components/accounting/AccountingSection';
import Footer from '../components/Footer';
import { PollWidget } from "@/components/polls/PollWidget";
import FloatingToolsMenu from '@/components/accounting/FloatingToolsMenu';
import ToolsSection from '@/components/tools/ToolsSection';
import HomeCarousel from '@/components/carousel/HomeCarousel';
import UsefulLinksSection from '@/components/useful-links/UsefulLinksSection';
import ZoomControl from '@/components/zoom/ZoomControl';
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
  return <div className="relative min-h-screen bg-[#FFF1DE] dark:bg-[#020817]">
      <Navbar />
      <div id="main-content">
        <main>
          <Hero />
          <About />
          <ToolsSection />
          <HomeCarousel />
          <UsefulLinksSection />
          <BusinessNews />
          <AccountingSection />
        </main>
        <Footer />
      </div>
      
      {/* Poll Widget */}
      <PollWidget />
      
      {/* Zoom Control */}
      <ZoomControl />
      
      {/* Fixed navigation dots */}
      <div className="fixed right-6 top-1/2 transform -translate-y-1/2 z-40 hidden lg:block">
        
      </div>
      
      {/* Floating Tools Menu */}
      <FloatingToolsMenu />
    </div>;
};
export default Index;