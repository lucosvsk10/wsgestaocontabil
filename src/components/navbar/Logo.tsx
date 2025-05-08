
import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';

const Logo: React.FC = () => {
  return (
    <div className="flex items-center">
      <a href="/" className="flex items-center space-x-2">
        {/* Logo removido conforme solicitado */}
        <span className="text-navy dark:text-gold font-medium">WS Contábil</span>
      </a>
    </div>
  );
};

export default Logo;
