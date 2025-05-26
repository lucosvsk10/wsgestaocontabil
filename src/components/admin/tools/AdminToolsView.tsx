
import React from 'react';
import { Button } from '@/components/ui/button';
import { Calculator, FileText, PieChart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const AdminToolsView: React.FC = () => {
  const navigate = useNavigate();

  const tools = [
    {
      title: "Simulador de IRPF",
      description: "Calculadora para simulação de imposto de renda.",
      icon: <Calculator className="h-12 w-12 text-green-600 dark:text-green-400" />,
      action: () => navigate('/simulador-irpf')
    },
    {
      title: "Gerador de Enquetes",
      description: "Crie enquetes para seus clientes.",
      icon: <PieChart className="h-12 w-12 text-blue-600 dark:text-blue-400" />,
      action: () => navigate('/admin/polls')
    },
    {
      title: "Gerenciador de Documentos",
      description: "Gerencie documentos por cliente.",
      icon: <FileText className="h-12 w-12 text-purple-600 dark:text-purple-400" />,
      action: () => navigate('/admin/users')
    }
  ];

  return (
    <div className="space-y-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#020817] dark:text-[#efc349] mb-4">Ferramentas</h1>
        <p className="text-gray-600 dark:text-white/70">Acesse as principais ferramentas do sistema</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {tools.map((tool, index) => (
          <div 
            key={index} 
            className="p-8 text-center space-y-6 transition-all duration-300 hover:scale-105 group bg-white dark:bg-transparent rounded-xl border border-gray-100 dark:border-none hover:shadow-lg dark:hover:shadow-none"
          >
            <div className="flex items-center justify-center">
              <div className="rounded-full bg-gray-50 dark:bg-[#efc349]/10 p-6 group-hover:scale-110 transition-all duration-300">
                {tool.icon}
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="text-xl font-medium text-[#020817] dark:text-[#efc349]">
                {tool.title}
              </h3>
              <p className="text-gray-500 dark:text-white/70">
                {tool.description}
              </p>
            </div>
            <Button 
              variant="outline" 
              className="w-full transition-all duration-300 hover:scale-105"
              onClick={tool.action}
            >
              Acessar
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};
