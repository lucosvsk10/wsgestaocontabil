
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

interface SimpleNavbarProps {
  title: string;
}

const SimpleNavbar = ({ title }: SimpleNavbarProps) => {
  const navigate = useNavigate();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 dark:bg-[#020817]/95 backdrop-blur-sm border-b border-[#efc349]/20">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="text-[#020817] dark:text-[#efc349] hover:bg-[#efc349]/10"
            >
              <ArrowLeft size={20} />
            </Button>
            <img 
              src="/lovable-uploads/cb878201-552e-4728-a814-1554857917b4.png" 
              alt="WS Gestão Contábil" 
              className="h-8"
            />
            <span className="text-lg font-extralight text-[#020817] dark:text-[#efc349]">
              {title}
            </span>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
};

export default SimpleNavbar;
