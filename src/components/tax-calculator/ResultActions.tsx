
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import ContactForm from "./ContactForm";
import { UseFormReturn } from "react-hook-form";
import { TaxFormValues } from "@/types/tax-simulations";

interface ResultActionsProps {
  isLoggedIn: boolean;
  form: UseFormReturn<TaxFormValues, any, undefined>;
  onSaveSimulation: () => void;
  onContactWhatsApp: () => void;
}

const ResultActions: React.FC<ResultActionsProps> = ({
  isLoggedIn,
  form,
  onSaveSimulation,
  onContactWhatsApp,
}) => {
  const [showContactForm, setShowContactForm] = useState(false);

  return (
    <div className="flex flex-col md:flex-row justify-center gap-4 mb-8">
      {isLoggedIn ? (
        <Button onClick={onSaveSimulation} className="min-w-[200px]">
          Enviar simulação para análise da WS
        </Button>
      ) : (
        <>
          {!showContactForm ? (
            <div className="space-y-4 w-full max-w-md mx-auto">
              <Button onClick={() => setShowContactForm(true)} className="w-full">
                Enviar para análise personalizada
              </Button>
              <Button onClick={onContactWhatsApp} variant="outline" className="w-full">
                Fale com a WS
              </Button>
            </div>
          ) : (
            <ContactForm form={form} onSave={onSaveSimulation} />
          )}
        </>
      )}
    </div>
  );
};

export default ResultActions;
