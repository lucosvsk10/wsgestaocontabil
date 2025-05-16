
import React from "react";
import { UseFormReturn } from "react-hook-form";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TaxFormValues } from "@/types/tax-simulations";

interface ContactFormProps {
  form: UseFormReturn<TaxFormValues, any, undefined>;
  onSave: () => void;
}

const ContactForm: React.FC<ContactFormProps> = ({ form, onSave }) => {
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="pt-6">
        <h3 className="text-lg font-medium mb-4 text-navy dark:text-gold">
          Seus dados para contato
        </h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="nome" className="text-sm font-medium">
              Nome completo
            </label>
            <Input
              id="nome"
              {...form.register("nome")}
              className="mt-1"
            />
          </div>
          <div>
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="email"
              type="email"
              {...form.register("email")}
              className="mt-1"
            />
          </div>
          <div>
            <label htmlFor="telefone" className="text-sm font-medium">
              Telefone
            </label>
            <Input
              id="telefone"
              {...form.register("telefone")}
              className="mt-1"
            />
          </div>
          <div className="pt-2">
            <Button onClick={onSave} className="w-full">
              Enviar simulação
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ContactForm;
