
import React from 'react';

const Logo: React.FC = () => {
  return (
    <div className="flex items-center">
      <a href="/" className="flex items-center space-x-2">
        <img 
          alt="WS Gestão Contábil Logo" 
          src="/lovable-uploads/fecb5c37-c321-44e3-89ca-58de7e59e59d.png" 
          className="h-8 w-auto" 
        />
      </a>
    </div>
  );
};

export default Logo;
