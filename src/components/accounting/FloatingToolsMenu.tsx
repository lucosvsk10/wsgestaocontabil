
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Calculator, ChevronUp, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import TaxCalculator from "@/pages/TaxCalculator";

interface FloatingToolsMenuProps {
  className?: string;
}

const FloatingToolsMenu = ({ className }: FloatingToolsMenuProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isTaxCalculatorOpen, setIsTaxCalculatorOpen] = useState(false);
  const [isComingSoonOpen, setIsComingSoonOpen] = useState(false);
  const [comingSoonTitle, setComingSoonTitle] = useState("");

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const openTaxCalculator = () => {
    setIsMenuOpen(false);
    setIsTaxCalculatorOpen(true);
  };

  const openComingSoon = (title: string) => {
    setComingSoonTitle(title);
    setIsMenuOpen(false);
    setIsComingSoonOpen(true);
  };

  return (
    <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
      {/* Menu Options */}
      {isMenuOpen && (
        <div className="bg-white dark:bg-navy-dark border border-gold/30 rounded-lg p-4 shadow-lg mb-4 animate-fade-in">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-gold font-medium">Ferramentas</h3>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-gold hover:bg-navy-light" 
              onClick={toggleMenu}
            >
              <X size={18} />
            </Button>
          </div>
          <div className="space-y-2">
            <button 
              className="block w-full text-left text-navy dark:text-white hover:text-gold transition-colors p-2 hover:bg-orange-300 dark:hover:bg-navy-light rounded"
              onClick={openTaxCalculator}
            >
              Simulador de IRPF
            </button>
            <button 
              className="block w-full text-left text-navy dark:text-white hover:text-gold transition-colors p-2 hover:bg-orange-300 dark:hover:bg-navy-light rounded"
              onClick={() => openComingSoon("Calculadora de INSS")}
            >
              Calculadora de INSS (em breve)
            </button>
            <button 
              className="block w-full text-left text-navy dark:text-white hover:text-gold transition-colors p-2 hover:bg-orange-300 dark:hover:bg-navy-light rounded"
              onClick={() => openComingSoon("Simulação de Pró-labore")}
            >
              Simulação de Pró-labore (em breve)
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
            <DialogTitle className="text-xl font-bold text-navy dark:text-gold">
              Simulador de Imposto de Renda
            </DialogTitle>
            <DialogDescription>
              Faça uma simulação rápida do seu Imposto de Renda
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <TaxCalculator />
          </div>
        </DialogContent>
      </Dialog>

      {/* Coming Soon Dialog */}
      <Dialog open={isComingSoonOpen} onOpenChange={setIsComingSoonOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-navy dark:text-gold">
              {comingSoonTitle}
            </DialogTitle>
          </DialogHeader>
          <div className="py-6 text-center">
            <p className="text-navy dark:text-white/80">
              Esta funcionalidade estará disponível em breve!
            </p>
            <p className="mt-2 text-navy/70 dark:text-white/60">
              Nossa equipe está trabalhando para disponibilizar esta ferramenta o mais rápido possível.
            </p>
          </div>
          <div className="flex justify-center">
            <Button onClick={() => setIsComingSoonOpen(false)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FloatingToolsMenu;
