
import React from 'react';
import { Button } from '@/components/ui/button';
import { LineChart, Shield, Users } from 'lucide-react';

const WelcomeBlock = () => {
  return (
    <div className="flex flex-col gap-6 md:gap-8 items-center justify-center text-center md:text-left px-6 md:px-10 py-10 bg-background text-foreground">
      <h2 className="text-3xl md:text-4xl font-extrabold text-primary">
        Bem-vindo à WS GESTÃO CONTÁBIL
      </h2>
      
      <p className="text-lg md:text-xl text-muted-foreground">
        Soluções contábeis modernas para transformar sua empresa
      </p>
      
      <div className="flex flex-wrap gap-6 justify-center md:justify-start mt-4 w-full">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 text-primary p-3 rounded-full">
            <LineChart size={24} />
          </div>
          <span className="text-sm font-medium text-foreground">Relatórios automatizados</span>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 text-primary p-3 rounded-full">
            <Shield size={24} />
          </div>
          <span className="text-sm font-medium text-foreground">Segurança de dados garantida</span>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 text-primary p-3 rounded-full">
            <Users size={24} />
          </div>
          <span className="text-sm font-medium text-foreground">Atendimento personalizado</span>
        </div>
      </div>
      
      <div className="flex gap-4 mt-6 flex-wrap justify-center md:justify-start w-full">
        <Button
          variant="default"
          className="rounded-xl font-semibold hover:opacity-90"
          onClick={() => {
            const element = document.getElementById('quemsomos');
            if (element) {
              element.scrollIntoView({ behavior: 'smooth' });
            }
          }}
        >
          Saiba Mais
        </Button>
        <Button
          variant="outline"
          className="border-primary text-primary hover:bg-primary/10 rounded-xl"
          onClick={() => {
            const element = document.getElementById('contato');
            if (element) {
              element.scrollIntoView({ behavior: 'smooth' });
            }
          }}
        >
          Fale Conosco
        </Button>
      </div>
    </div>
  );
};

export default WelcomeBlock;
