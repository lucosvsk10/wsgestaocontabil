
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Calculator, FileText, PieChart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const AdminToolsView: React.FC = () => {
  const navigate = useNavigate();

  const tools = [
    {
      title: "Simulador de IRPF",
      description: "Calculadora para simulação de imposto de renda.",
      icon: <Calculator className="h-6 w-6 text-green-600 dark:text-green-400" />,
      action: () => navigate('/simulador-irpf')
    },
    {
      title: "Gerador de Enquetes",
      description: "Crie enquetes para seus clientes.",
      icon: <PieChart className="h-6 w-6 text-blue-600 dark:text-blue-400" />,
      action: () => navigate('/admin/polls')
    },
    {
      title: "Gerenciador de Documentos",
      description: "Gerencie documentos por cliente.",
      icon: <FileText className="h-6 w-6 text-purple-600 dark:text-purple-400" />,
      action: () => navigate('/admin/users')
    }
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-navy dark:text-gold">Ferramentas</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tools.map((tool, index) => (
          <Card key={index} className="bg-white dark:bg-navy-dark border border-gray-200 dark:border-gold/20 hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-3">
                  {tool.icon}
                </div>
                <CardTitle className="text-lg font-medium text-navy dark:text-gold">
                  {tool.title}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="mb-4 text-gray-600 dark:text-gray-300">
                {tool.description}
              </CardDescription>
              <Button 
                variant="outline" 
                className="w-full bg-navy/10 text-navy hover:bg-navy hover:text-white dark:bg-gold/10 dark:text-gold dark:hover:bg-gold dark:hover:text-navy"
                onClick={tool.action}
              >
                Acessar
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
