
import React from 'react';
import { FiscalNotesList } from '@/components/client/fiscal/FiscalNotesList';

export const AdminFiscalNotesList = () => {
  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-3xl font-bold text-navy dark:text-white">
          Notas Fiscais - Administração
        </h1>
        <p className="text-muted-foreground mt-2">
          Visualize todas as notas fiscais do sistema
        </p>
      </div>
      
      <FiscalNotesList />
    </div>
  );
};
