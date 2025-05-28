
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Calculator, ChevronUp, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import TaxCalculator from "@/pages/TaxCalculator";
import { useNavigate } from 'react-router-dom';

interface FloatingToolsMenuProps {
  className?: string;
}

const FloatingToolsMenu = ({
  className
}: FloatingToolsMenuProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isTaxCalculatorOpen, setIsTaxCalculatorOpen] = useState(false);
  const navigate = useNavigate();

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const openTaxCalculator = () => {
    setIsMenuOpen(false);
    setIsTaxCalculatorOpen(true);
  };

  const navigateToCalculator = (path: string) => {
    setIsMenuOpen(false);
    navigate(path);
  };

  return (
    <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
      {/* Menu Options */}
      {isMenuOpen && (
        <div className="bg-white dark:bg-navy-dark border border-gold/30 rounded-lg p-4 shadow-lg mb-4 animate-fade-in">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-gold font-extralight">Ferramentas</h3>
            <Button variant="ghost" size="icon" className="text-gold hover:bg-navy-light" onClick={toggleMenu}>
              <X size={18} />
            </Button>
          </div>
          <div className="space-y-2">
            <button 
              className="block w-full text-left text-navy dark:text-white hover:text-gold transition-colors p-2 hover:bg-orange-300 dark:hover:bg-navy-light rounded font-extralight" 
              onClick={openTaxCalculator}
            >
              Simulador de IRPF
            </button>
            <button 
              className="block w-full text-left text-navy dark:text-white hover:text-gold transition-colors p-2 hover:bg-orange-300 dark:hover:bg-navy-light rounded font-extralight" 
              onClick={() => navigateToCalculator('/calculadora-inss')}
            >
              Calculadora de INSS
            </button>
            <button 
              className="block w-full text-left text-navy dark:text-white hover:text-gold transition-colors p-2 hover:bg-orange-300 dark:hover:bg-navy-light rounded font-extralight" 
              onClick={() => navigateToCalculator('/simulador-prolabore')}
            >
              Simulador de Pró-labore
            </button>
          </div>
        </div>
      )}
      
      {/* Toggle Button */}
      <Button 
        size="icon" 
        className={`h-14 w-14 rounded-full bg-gold hover:bg-gold-light text-navy shadow-lg ${isMenuOpen ? "" : "animate-bounce"}`} 
        onClick={toggleMenu} 
        aria-label="Menu de Ferramentas"
      >
        {isMenuOpen ? <ChevronUp size={24} /> : <Calculator size={24} />}
      </Button>

      {/* Tax Calculator Dialog */}
      <Dialog open={isTaxCalculatorOpen} onOpenChange={setIsTaxCalculatorOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl text-navy dark:text-gold font-extralight">
              Simulador de Imposto de Renda
            </DialogTitle>
            <DialogDescription className="font-extralight">
              Faça uma simulação rápida do seu Imposto de Renda
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <TaxCalculator />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FloatingToolsMenu;
