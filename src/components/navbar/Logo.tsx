
import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';

const Logo: React.FC = () => {
  const { theme } = useTheme();
  
  return (
    <div className="flex items-center">
      <a href="/" className="flex items-center space-x-2">
        <img 
          alt="WS Gestão Contábil Logo" 
          src={theme === 'light' 
            ? "/lovable-uploads/f7fdf0cf-f16c-4df7-a92c-964aadea9539.png" 
            : "/lovable-uploads/fecb5c37-c321-44e3-89ca-58de7e59e59d.png"} 
          className="h-8 w-auto" 
        />
      </a>
    </div>
  );
};

export default Logo;
