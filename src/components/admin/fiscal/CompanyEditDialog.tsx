
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Loader2 } from "lucide-react";
import { useReceiptaFederalAPI } from "@/hooks/company/useReceiptaFederalAPI";
import { toast } from "sonner";

interface CompanyEditDialogProps {
  company: any;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (formData: any, certificateFile?: File, password?: string) => Promise<void>;
}

export const CompanyEditDialog = ({ company, isOpen, onClose, onUpdate }: CompanyEditDialogProps) => {
  const [formData, setFormData] = useState({
    cnpj: '',
    razaoSocial: '',
    nomeFantasia: '',
    inscricaoEstadual: '',
    inscricaoMunicipal: ''
  });
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [certificatePassword, setCertificatePassword] = useState('');
  const [isValidatingCnpj, setIsValidatingCnpj] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const { fetchCompanyData } = useReceiptaFederalAPI();

  useEffect(() => {
    if (company && isOpen) {
      setFormData({
        cnpj: company.cnpj || '',
        razaoSocial: company.razao_social || '',
        nomeFantasia: company.nome_fantasia || '',
        inscricaoEstadual: company.inscricao_estadual || '',
        inscricaoMunicipal: company.inscricao_municipal || ''
      });
    }
  }, [company, isOpen]);

  const formatCNPJ = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    const formatted = cleaned.replace(
      /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
      '$1.$2.$3/$4-$5'
    );
    return formatted;
  };

  const validateCNPJ = (cnpj: string) => {
    const cleaned = cnpj.replace(/\D/g, '');
    return cleaned.length === 14;
  };

  const handleCnpjChange = async (value: string) => {
    const formatted = formatCNPJ(value);
    setFormData({...formData, cnpj: formatted});

    if (validateCNPJ(formatted)) {
      setIsValidatingCnpj(true);
      try {
        const companyData = await fetchCompanyData(formatted);
        if (companyData) {
          setFormData(prev => ({
            ...prev,
            razaoSocial: companyData.nome || '',
            nomeFantasia: companyData.fantasia || '',
            inscricaoEstadual: '',
            inscricaoMunicipal: ''
          }));
        }
      } catch (error) {
        console.error('Erro ao buscar dados da empresa:', error);
      } finally {
        setIsValidatingCnpj(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateCNPJ(formData.cnpj)) {
      toast.error("Por favor, informe um CNPJ válido");
      return;
    }

    setIsUpdating(true);
    try {
      await onUpdate(formData, certificateFile, certificatePassword);
      toast.success("Empresa atualizada com sucesso!");
      onClose();
    } catch (error) {
      toast.error("Erro ao atualizar empresa. Verifique os dados.");
    } finally {
      setIsUpdating(false);
    }
  };

  const isFormValid = validateCNPJ(formData.cnpj) && 
                     formData.razaoSocial && 
                     !isValidatingCnpj;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-white dark:bg-[#020817] border-[#efc349]/20">
        <DialogHeader>
          <DialogTitle className="text-[#020817] dark:text-white">
            Editar Empresa
          </DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-400">
            Atualize os dados da empresa e certificado digital se necessário
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cnpj" className="text-[#020817] dark:text-white">
                CNPJ *
              </Label>
              <div className="relative">
                <Input
                  id="cnpj"
                  placeholder="00.000.000/0001-00"
                  value={formData.cnpj}
                  onChange={(e) => handleCnpjChange(e.target.value)}
                  required
                  maxLength={18}
                  className="border-[#efc349]/20 focus:border-[#efc349]"
                />
                {isValidatingCnpj && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <Loader2 className="w-4 h-4 animate-spin text-[#efc349]" />
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="razaoSocial" className="text-[#020817] dark:text-white">
                Razão Social *
              </Label>
              <Input
                id="razaoSocial"
                placeholder="Nome da empresa"
                value={formData.razaoSocial}
                onChange={(e) => setFormData({...formData, razaoSocial: e.target.value})}
                required
                className="border-[#efc349]/20 focus:border-[#efc349]"
                disabled={isValidatingCnpj}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="nomeFantasia" className="text-[#020817] dark:text-white">
              Nome Fantasia
            </Label>
            <Input
              id="nomeFantasia"
              placeholder="Nome fantasia (opcional)"
              value={formData.nomeFantasia}
              onChange={(e) => setFormData({...formData, nomeFantasia: e.target.value})}
              className="border-[#efc349]/20 focus:border-[#efc349]"
              disabled={isValidatingCnpj}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="inscricaoEstadual" className="text-[#020817] dark:text-white">
                Inscrição Estadual
              </Label>
              <Input
                id="inscricaoEstadual"
                placeholder="IE (opcional)"
                value={formData.inscricaoEstadual}
                onChange={(e) => setFormData({...formData, inscricaoEstadual: e.target.value})}
                className="border-[#efc349]/20 focus:border-[#efc349]"
                disabled={isValidatingCnpj}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inscricaoMunicipal" className="text-[#020817] dark:text-white">
                Inscrição Municipal
              </Label>
              <Input
                id="inscricaoMunicipal"
                placeholder="IM (opcional)"
                value={formData.inscricaoMunicipal}
                onChange={(e) => setFormData({...formData, inscricaoMunicipal: e.target.value})}
                className="border-[#efc349]/20 focus:border-[#efc349]"
                disabled={isValidatingCnpj}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="certificate" className="text-[#020817] dark:text-white">
              Novo Certificado Digital A1 (opcional)
            </Label>
            <div className="flex items-center space-x-2">
              <Input
                id="certificate"
                type="file"
                accept=".p12,.pfx"
                onChange={(e) => setCertificateFile(e.target.files?.[0] || null)}
                className="border-[#efc349]/20 focus:border-[#efc349]"
                disabled={isValidatingCnpj}
              />
              <Upload className="w-5 h-5 text-[#efc349]" />
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Deixe em branco para manter o certificado atual
            </p>
          </div>

          {certificateFile && (
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#020817] dark:text-white">
                Senha do Novo Certificado *
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Senha do certificado digital"
                value={certificatePassword}
                onChange={(e) => setCertificatePassword(e.target.value)}
                required
                className="border-[#efc349]/20 focus:border-[#efc349]"
                disabled={isValidatingCnpj}
              />
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-[#efc349]/20 text-[#020817] dark:text-white"
              disabled={isUpdating}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-[#efc349] hover:bg-[#efc349]/90 text-[#020817]"
              disabled={!isFormValid || isUpdating}
            >
              {isUpdating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Atualizando...
                </>
              ) : (
                "Atualizar Empresa"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
