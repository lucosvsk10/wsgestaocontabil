
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
      icon: <Calculator className="h-8 w-8 text-green-600 dark:text-green-400" />,
      action: () => navigate('/simulador-irpf')
    },
    {
      title: "Gerador de Enquetes",
      description: "Crie enquetes para seus clientes.",
      icon: <PieChart className="h-8 w-8 text-blue-600 dark:text-blue-400" />,
      action: () => navigate('/admin/polls')
    },
    {
      title: "Gerenciador de Documentos",
      description: "Gerencie documentos por cliente.",
      icon: <FileText className="h-8 w-8 text-purple-600 dark:text-purple-400" />,
      action: () => navigate('/admin/users')
    }
  ];

  return (
    <div className="space-y-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#020817] dark:text-[#efc349] mb-2">Ferramentas</h1>
        <p className="text-gray-600 dark:text-white/70">Acesse as principais ferramentas do sistema</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {tools.map((tool, index) => (
          <Card 
            key={index} 
            className="border-0 shadow-sm dark:bg-transparent dark:border dark:border-[#efc349]/20 hover:shadow-lg transition-all duration-300 hover:scale-105 group"
          >
            <CardHeader className="text-center space-y-4">
              <div className="flex items-center justify-center">
                <div className="rounded-full bg-gray-50 dark:bg-[#efc349]/10 p-4 group-hover:scale-110 transition-all duration-300">
                  {tool.icon}
                </div>
              </div>
              <CardTitle className="text-lg font-medium text-[#020817] dark:text-[#efc349]">
                {tool.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <CardDescription className="text-gray-500 dark:text-white/70">
                {tool.description}
              </CardDescription>
              <Button 
                variant="outline" 
                className="w-full transition-all duration-300 hover:scale-105"
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
