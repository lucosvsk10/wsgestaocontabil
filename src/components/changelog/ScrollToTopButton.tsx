
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { ArrowUp } from "lucide-react";

const ScrollToTopButton = () => {
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      {/* Floating Back to Top Button */}
      {showScrollTop && (
        <Button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 z-50 rounded-full w-12 h-12 bg-[#efc349] hover:bg-[#efc349]/80 text-[#020817] shadow-lg transition-all duration-300"
          size="icon"
        >
          <ArrowUp size={20} />
        </Button>
      )}

      {/* Static Back to Top Button */}
      <div className="text-center">
        <Button
          onClick={scrollToTop}
          variant="outline"
          className="border-[#efc349] text-[#efc349] hover:bg-[#efc349]/10"
        >
          <ArrowUp size={16} className="mr-2" />
          Voltar ao topo
        </Button>
      </div>
    </>
  );
};

export default ScrollToTopButton;
