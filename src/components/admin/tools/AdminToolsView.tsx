
import React from 'react';
import { Button } from '@/components/ui/button';
import { Calculator, FileText, PieChart, Building2, CreditCard, Images } from 'lucide-react';
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
      title: "Calculadora de INSS",
      description: "Calcule contribuições do INSS por categoria.",
      icon: <CreditCard className="h-12 w-12 text-blue-600 dark:text-blue-400" />,
      action: () => navigate('/calculadora-inss')
    },
    {
      title: "Simulador de Pró-labore",
      description: "Simule valores líquidos de pró-labore.",
      icon: <Building2 className="h-12 w-12 text-purple-600 dark:text-purple-400" />,
      action: () => navigate('/simulador-prolabore')
    },
    {
      title: "Carrossel",
      description: "Gerencie o carrossel da página principal.",
      icon: <Images className="h-12 w-12 text-orange-600 dark:text-orange-400" />,
      action: () => navigate('/admin/carousel')
    },
    {
      title: "Gerador de Enquetes",
      description: "Crie enquetes para seus clientes.",
      icon: <PieChart className="h-12 w-12 text-orange-600 dark:text-orange-400" />,
      action: () => navigate('/admin/polls')
    },
    {
      title: "Gerenciador de Documentos",
      description: "Gerencie documentos por cliente.",
      icon: <FileText className="h-12 w-12 text-indigo-600 dark:text-indigo-400" />,
      action: () => navigate('/admin/users')
    },
    {
      title: "Histórico de Simulações",
      description: "Visualize todas as simulações realizadas.",
      icon: <Calculator className="h-12 w-12 text-red-600 dark:text-red-400" />,
      action: () => navigate('/admin/simulations')
    }
  ];

  return (
    <div className="space-y-8">
      <div className="mb-8">
        <h1 className="text-3xl text-[#020817] dark:text-[#efc349] mb-4 font-extralight">Ferramentas</h1>
        <p className="text-gray-600 dark:text-white/70 font-extralight">Acesse as principais ferramentas do sistema</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {tools.map((tool, index) => (
          <div key={index} className="p-8 text-center space-y-6 transition-all duration-300 hover:scale-105 group bg-white dark:bg-transparent rounded-xl border border-gray-100 dark:border-[#efc349]/20 hover:shadow-lg dark:hover:shadow-none">
            <div className="flex items-center justify-center">
              <div className="rounded-full bg-gray-50 dark:bg-[#efc349]/10 p-6 group-hover:scale-110 transition-all duration-300">
                {tool.icon}
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="text-xl text-[#020817] dark:text-[#efc349] font-extralight">
                {tool.title}
              </h3>
              <p className="text-gray-500 dark:text-white/70 font-extralight">
                {tool.description}
              </p>
            </div>
            <Button 
              variant="outline" 
              className="w-full transition-all duration-300 hover:scale-105 font-extralight border-[#efc349]/30 hover:bg-[#efc349]/10" 
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
