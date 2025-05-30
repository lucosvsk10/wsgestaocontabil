
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Building, Save, Loader2 } from 'lucide-react';

interface CompanyData {
  id?: string;
  name: string;
  cnpj: string;
  opening_date: string;
  tax_regime: string;
  address: string;
  phone: string;
  email: string;
  accountant_name: string;
  accountant_contact: string;
}

interface CompanyDataModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
}

export const CompanyDataModal = ({ open, onOpenChange, userId, userName }: CompanyDataModalProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [companyData, setCompanyData] = useState<CompanyData>({
    name: '',
    cnpj: '',
    opening_date: '',
    tax_regime: '',
    address: '',
    phone: '',
    email: '',
    accountant_name: '',
    accountant_contact: ''
  });

  useEffect(() => {
    if (open && userId) {
      fetchCompanyData();
    }
  }, [open, userId]);

  const fetchCompanyData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('company_data')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setCompanyData({
          id: data.id,
          name: data.name || '',
          cnpj: data.cnpj || '',
          opening_date: data.opening_date || '',
          tax_regime: data.tax_regime || '',
          address: data.address || '',
          phone: data.phone || '',
          email: data.email || '',
          accountant_name: data.accountant_name || '',
          accountant_contact: data.accountant_contact || ''
        });
      }
    } catch (error) {
      console.error('Erro ao buscar dados da empresa:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados da empresa.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const dataToSave = {
        user_id: userId,
        name: companyData.name,
        cnpj: companyData.cnpj,
        opening_date: companyData.opening_date,
        tax_regime: companyData.tax_regime,
        address: companyData.address,
        phone: companyData.phone,
        email: companyData.email,
        accountant_name: companyData.accountant_name,
        accountant_contact: companyData.accountant_contact,
        updated_at: new Date().toISOString()
      };

      let result;
      if (companyData.id) {
        result = await supabase
          .from('company_data')
          .update(dataToSave)
          .eq('id', companyData.id);
      } else {
        result = await supabase
          .from('company_data')
          .insert([dataToSave]);
      }

      if (result.error) throw result.error;

      toast({
        title: "Sucesso",
        description: "Dados da empresa salvos com sucesso."
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao salvar dados da empresa:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar os dados da empresa.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof CompanyData, value: string) => {
    setCompanyData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-[#0b1320] border-gray-200 dark:border-[#efc349]/30">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#020817] dark:text-[#efc349] font-extralight text-2xl">
            <Building className="w-6 h-6" />
            Dados da Empresa - {userName}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-[#efc349]" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Informações básicas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name" className="font-extralight">Razão Social</Label>
                <Input
                  id="name"
                  value={companyData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30 font-extralight"
                />
              </div>
              <div>
                <Label htmlFor="cnpj" className="font-extralight">CNPJ</Label>
                <Input
                  id="cnpj"
                  value={companyData.cnpj}
                  onChange={(e) => handleInputChange('cnpj', e.target.value)}
                  placeholder="00.000.000/0000-00"
                  className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30 font-extralight"
                />
              </div>
              <div>
                <Label htmlFor="opening_date" className="font-extralight">Data de Abertura</Label>
                <Input
                  id="opening_date"
                  type="date"
                  value={companyData.opening_date}
                  onChange={(e) => handleInputChange('opening_date', e.target.value)}
                  className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30 font-extralight"
                />
              </div>
              <div>
                <Label htmlFor="tax_regime" className="font-extralight">Regime Tributário</Label>
                <Input
                  id="tax_regime"
                  value={companyData.tax_regime}
                  onChange={(e) => handleInputChange('tax_regime', e.target.value)}
                  placeholder="Simples Nacional, Lucro Presumido, etc."
                  className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30 font-extralight"
                />
              </div>
            </div>

            {/* Endereço */}
            <div>
              <Label htmlFor="address" className="font-extralight">Endereço Completo</Label>
              <Textarea
                id="address"
                value={companyData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="Rua, número, bairro, cidade, estado, CEP"
                className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30 font-extralight"
                rows={3}
              />
            </div>

            {/* Contato */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone" className="font-extralight">Telefone</Label>
                <Input
                  id="phone"
                  value={companyData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30 font-extralight"
                />
              </div>
              <div>
                <Label htmlFor="email" className="font-extralight">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={companyData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="empresa@exemplo.com"
                  className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30 font-extralight"
                />
              </div>
            </div>

            {/* Contador responsável */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="accountant_name" className="font-extralight">Nome do Contador</Label>
                <Input
                  id="accountant_name"
                  value={companyData.accountant_name}
                  onChange={(e) => handleInputChange('accountant_name', e.target.value)}
                  className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30 font-extralight"
                />
              </div>
              <div>
                <Label htmlFor="accountant_contact" className="font-extralight">Contato do Contador</Label>
                <Input
                  id="accountant_contact"
                  value={companyData.accountant_contact}
                  onChange={(e) => handleInputChange('accountant_contact', e.target.value)}
                  placeholder="Telefone ou e-mail"
                  className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30 font-extralight"
                />
              </div>
            </div>

            {/* Botões */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="font-extralight border-gray-300 dark:border-[#efc349]/30"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="font-extralight bg-[#efc349] text-[#020817] hover:bg-[#efc349]/90"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Salvar
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
