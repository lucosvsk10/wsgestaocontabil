
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface CompanyDeleteDialogProps {
  company: any;
  isOpen: boolean;
  onClose: () => void;
  onDelete: (companyId: string) => Promise<void>;
}

export const CompanyDeleteDialog = ({ company, isOpen, onClose, onDelete }: CompanyDeleteDialogProps) => {
  const [confirmationCnpj, setConfirmationCnpj] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const formatCNPJ = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    const formatted = cleaned.replace(
      /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
      '$1.$2.$3/$4-$5'
    );
    return formatted;
  };

  const handleCnpjChange = (value: string) => {
    const formatted = formatCNPJ(value);
    setConfirmationCnpj(formatted);
  };

  const handleDelete = async () => {
    if (confirmationCnpj !== company?.cnpj) {
      toast.error("CNPJ não confere. Digite exatamente o CNPJ da empresa.");
      return;
    }

    setIsDeleting(true);
    try {
      await onDelete(company.id);
      toast.success("Empresa excluída com sucesso!");
      onClose();
      setConfirmationCnpj('');
    } catch (error) {
      toast.error("Erro ao excluir empresa. Tente novamente.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    setConfirmationCnpj('');
    onClose();
  };

  const canDelete = confirmationCnpj === company?.cnpj && confirmationCnpj.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] bg-white dark:bg-[#020817] border-red-500/20">
        <DialogHeader>
          <DialogTitle className="text-red-600 dark:text-red-400 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Confirmar Exclusão
          </DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-400">
            Esta ação não pode ser desfeita. Todos os dados da empresa serão permanentemente removidos.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-red-800 dark:text-red-200">
                Empresa a ser excluída:
              </p>
              <p className="text-sm font-bold text-red-900 dark:text-red-100">
                {company?.razao_social}
              </p>
              <p className="text-sm text-red-700 dark:text-red-300 font-mono">
                CNPJ: {company?.cnpj}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmCnpj" className="text-[#020817] dark:text-white">
              Digite o CNPJ da empresa para confirmar a exclusão:
            </Label>
            <Input
              id="confirmCnpj"
              placeholder="00.000.000/0001-00"
              value={confirmationCnpj}
              onChange={(e) => handleCnpjChange(e.target.value)}
              maxLength={18}
              className="border-red-300 focus:border-red-500 dark:border-red-700 dark:focus:border-red-500"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            className="border-[#efc349]/20 text-[#020817] dark:text-white"
            disabled={isDeleting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleDelete}
            className="bg-red-600 hover:bg-red-700 text-white"
            disabled={!canDelete || isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Excluindo...
              </>
            ) : (
              "Confirmar Exclusão"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
