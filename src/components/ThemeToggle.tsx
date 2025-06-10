
import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Sun, Moon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="rounded-full w-10 h-10 p-0 dark:border dark:border-gold/30"
            aria-label={theme === 'dark' ? 'Alternar para modo claro' : 'Alternar para modo escuro'}
          >
            {theme === 'dark' ? (
              <Sun size={18} className="text-gold" />
            ) : (
              <Moon size={18} />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent className="dark:bg-transparent dark:border-gold/30 dark:text-[#d9d9d9]">
          <p>{theme === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default ThemeToggle;
