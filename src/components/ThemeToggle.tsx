
import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Sun, Moon } from 'lucide-react';
import { Toggle } from "@/components/ui/toggle";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  
  const handleToggle = () => {
    toggleTheme();
    // Scroll to top of the page
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Toggle
            aria-label="Toggle theme"
            onClick={handleToggle}
            className={`${theme === 'dark' ? 'bg-white text-[#46413d] hover:bg-white/90' : 'bg-[#0a2946] text-white hover:bg-[#0a2946]/90'} p-2 rounded-full`}
            pressed={theme === 'dark'}
          >
            {theme === 'dark' ? (
              <Sun className="h-[1.2rem] w-[1.2rem]" />
            ) : (
              <Moon className="h-[1.2rem] w-[1.2rem]" />
            )}
          </Toggle>
        </TooltipTrigger>
        <TooltipContent>
          <p>{theme === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default ThemeToggle;
