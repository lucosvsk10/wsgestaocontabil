
import React from 'react';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

interface CompanyDataActionsProps {
  onSave: () => void;
  isSaving: boolean;
}

export const CompanyDataActions: React.FC<CompanyDataActionsProps> = ({
  onSave,
  isSaving
}) => {
  return (
    <div className="flex justify-end pt-6">
      <Button
        onClick={onSave}
        disabled={isSaving}
        className="bg-[#020817] dark:bg-transparent border border-[#efc349] text-white dark:text-[#efc349] hover:bg-[#020817]/90 dark:hover:bg-[#efc349]/10 font-extralight"
      >
        {isSaving ? (
          <>
            <LoadingSpinner />
            Salvando...
          </>
        ) : (
          <>
            <Save className="h-4 w-4 mr-2" />
            Salvar Dados
          </>
        )}
      </Button>
    </div>
  );
};
