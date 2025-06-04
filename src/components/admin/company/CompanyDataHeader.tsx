
import React from 'react';
import { Building } from 'lucide-react';

export const CompanyDataHeader: React.FC = () => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Building className="h-8 w-8 text-[#020817] dark:text-[#efc349]" />
        <div>
          <h1 className="text-3xl font-extralight text-[#020817] dark:text-[#efc349]">
            Dados da Empresa
          </h1>
          <p className="text-gray-600 dark:text-white/70 font-extralight">
            Gerencie as informações da empresa do cliente
          </p>
        </div>
      </div>
    </div>
  );
};
