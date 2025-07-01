
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Building2, Search, Settings, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Company {
  id: string;
  company_name: string;
  cnpj: string;
  fiscal_automation_client: boolean;
  created_at: string;
}

export const FiscalAutomationManager = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('companies')
        .select('id, company_name, cnpj, fiscal_automation_client, created_at')
        .order('company_name');

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Erro ao carregar empresas:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar empresas",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleFiscalAutomation = async (companyId: string, currentStatus: boolean) => {
    try {
      setUpdating(companyId);
      const { error } = await supabase
        .from('companies')
        .update({ fiscal_automation_client: !currentStatus })
        .eq('id', companyId);

      if (error) throw error;

      setCompanies(prev =>
        prev.map(company =>
          company.id === companyId
            ? { ...company, fiscal_automation_client: !currentStatus }
            : company
        )
      );

      toast({
        title: "Sucesso",
        description: `Cliente de automação fiscal ${!currentStatus ? 'ativado' : 'desativado'} com sucesso`
      });
    } catch (error: any) {
      console.error('Erro ao atualizar status:', error);
      toast({
        title: "Erro",
        description: "Falha ao atualizar status da empresa",
        variant: "destructive"
      });
    } finally {
      setUpdating(null);
    }
  };

  const filteredCompanies = companies.filter(company =>
    company.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.cnpj.includes(searchTerm)
  );

  const automationClients = companies.filter(c => c.fiscal_automation_client);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-3xl font-bold text-navy dark:text-white">
          Clientes de Automação Fiscal
        </h1>
        <p className="text-muted-foreground mt-2">
          Gerencie quais empresas são clientes do plano de automação fiscal
        </p>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Empresas</CardTitle>
            <Building2 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{companies.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Automação</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{automationClients.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Adesão</CardTitle>
            <Settings className="h-4 w-4 text-gold" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gold">
              {companies.length > 0 ? Math.round((automationClients.length / companies.length) * 100) : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar por nome da empresa ou CNPJ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Lista de Empresas */}
      <Card>
        <CardHeader>
          <CardTitle>Empresas Cadastradas</CardTitle>
          <CardDescription>
            {filteredCompanies.length} empresa(s) encontrada(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredCompanies.map((company) => (
              <div
                key={company.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <div className="flex items-center gap-4">
                  <Building2 className="h-8 w-8 text-blue-600" />
                  <div>
                    <div className="font-medium">{company.company_name}</div>
                    <div className="text-sm text-muted-foreground">
                      CNPJ: {company.cnpj}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <Badge
                    className={
                      company.fiscal_automation_client
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }
                  >
                    {company.fiscal_automation_client ? (
                      <CheckCircle className="h-3 w-3 mr-1" />
                    ) : (
                      <XCircle className="h-3 w-3 mr-1" />
                    )}
                    {company.fiscal_automation_client ? 'Cliente Ativo' : 'Não Cliente'}
                  </Badge>
                  
                  <Switch
                    checked={company.fiscal_automation_client}
                    onCheckedChange={() => toggleFiscalAutomation(company.id, company.fiscal_automation_client)}
                    disabled={updating === company.id}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
