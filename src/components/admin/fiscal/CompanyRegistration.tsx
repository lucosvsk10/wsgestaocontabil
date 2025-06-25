
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Plus, Building, FileText, Calendar, AlertCircle, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useFiscalCompanies } from "@/hooks/fiscal/useFiscalCompanies";
import { useReceiptaFederalAPI } from "@/hooks/company/useReceiptaFederalAPI";
import { toast } from "sonner";

const CompanyRegistration = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
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

  const { companies, isLoading, createCompany, syncCompanyDocuments } = useFiscalCompanies();
  const { fetchCompanyData, loading: loadingReceita } = useReceiptaFederalAPI();

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

    // Se o CNPJ estiver completo e válido, buscar dados da Receita Federal
    if (validateCNPJ(formatted)) {
      setIsValidatingCnpj(true);
      try {
        const companyData = await fetchCompanyData(formatted);
        if (companyData) {
          setFormData(prev => ({
            ...prev,
            razaoSocial: companyData.nome || '',
            nomeFantasia: companyData.fantasia || '',
            inscricaoEstadual: '', // A API da Receita Federal não retorna IE
            inscricaoMunicipal: '' // A API da Receita Federal não retorna IM
          }));
        }
      } catch (error) {
        console.error('Erro ao buscar dados da empresa:', error);
      } finally {
        setIsValidatingCnpj(false);
      }
    } else {
      // Limpar campos se CNPJ incompleto
      setFormData(prev => ({
        ...prev,
        razaoSocial: '',
        nomeFantasia: '',
        inscricaoEstadual: '',
        inscricaoMunicipal: ''
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!certificateFile) {
      toast.error("Por favor, selecione um certificado digital");
      return;
    }

    if (!certificatePassword) {
      toast.error("Por favor, informe a senha do certificado");
      return;
    }

    if (!validateCNPJ(formData.cnpj)) {
      toast.error("Por favor, informe um CNPJ válido");
      return;
    }

    try {
      await createCompany(formData, certificateFile, certificatePassword);
      toast.success("Empresa cadastrada com sucesso!");
      setIsDialogOpen(false);
      setFormData({
        cnpj: '',
        razaoSocial: '',
        nomeFantasia: '',
        inscricaoEstadual: '',
        inscricaoMunicipal: ''
      });
      setCertificateFile(null);
      setCertificatePassword('');
    } catch (error) {
      toast.error("Erro ao cadastrar empresa. Verifique os dados.");
    }
  };

  const handleSync = async (companyId: string, cnpj: string) => {
    try {
      await syncCompanyDocuments(companyId, cnpj);
      toast.success("Sincronização iniciada com sucesso!");
    } catch (error) {
      toast.error("Erro ao iniciar sincronização");
    }
  };

  const isFormValid = validateCNPJ(formData.cnpj) && 
                     formData.razaoSocial && 
                     certificateFile && 
                     certificatePassword && 
                     !isValidatingCnpj;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#020817] dark:text-white">
            Empresas Cadastradas
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Gerencie empresas e seus certificados digitais
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#efc349] hover:bg-[#efc349]/90 text-[#020817]">
              <Plus className="w-4 h-4 mr-2" />
              Nova Empresa
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] bg-white dark:bg-[#020817] border-[#efc349]/20">
            <DialogHeader>
              <DialogTitle className="text-[#020817] dark:text-white">
                Cadastrar Nova Empresa
              </DialogTitle>
              <DialogDescription className="text-gray-600 dark:text-gray-400">
                Informe os dados da empresa e faça upload do certificado digital A1
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
                  Certificado Digital A1 *
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
                  Formatos aceitos: .p12, .pfx
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-[#020817] dark:text-white">
                  Senha do Certificado *
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

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  className="border-[#efc349]/20 text-[#020817] dark:text-white"
                  disabled={isValidatingCnpj}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-[#efc349] hover:bg-[#efc349]/90 text-[#020817]"
                  disabled={!isFormValid}
                >
                  {isValidatingCnpj ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Validando CNPJ...
                    </>
                  ) : (
                    "Cadastrar Empresa"
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Companies List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#efc349]"></div>
          </div>
        ) : companies.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-[#020817] dark:text-white mb-2">
              Nenhuma empresa cadastrada
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Cadastre sua primeira empresa para começar a usar o sistema
            </p>
          </div>
        ) : (
          companies.map((company) => (
            <Card 
              key={company.id} 
              className="bg-white/80 dark:bg-[#020817]/80 backdrop-blur-sm border-[#efc349]/20 hover:border-[#efc349]/40 transition-colors"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-[#efc349]/10 rounded-lg">
                      <Building className="w-5 h-5 text-[#efc349]" />
                    </div>
                    <div>
                      <CardTitle className="text-[#020817] dark:text-white text-lg">
                        {company.razao_social}
                      </CardTitle>
                      {company.nome_fantasia && (
                        <CardDescription className="text-gray-600 dark:text-gray-400">
                          {company.nome_fantasia}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                  <Badge 
                    variant="outline" 
                    className="border-green-500 text-green-500"
                  >
                    Ativo
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">CNPJ:</span>
                    <span className="font-mono text-[#020817] dark:text-white">
                      {company.cnpj}
                    </span>
                  </div>
                  {company.inscricao_estadual && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">IE:</span>
                      <span className="font-mono text-[#020817] dark:text-white">
                        {company.inscricao_estadual}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Cadastro:</span>
                    <span className="text-[#020817] dark:text-white">
                      {new Date(company.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    onClick={() => handleSync(company.id, company.cnpj)}
                    className="w-full bg-[#efc349] hover:bg-[#efc349]/90 text-[#020817]"
                    size="sm"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Sincronizar Documentos
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default CompanyRegistration;
