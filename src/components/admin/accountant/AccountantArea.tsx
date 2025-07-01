import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Building2, Download, FileSpreadsheet, Archive, Calendar, BookOpen, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

interface Company {
  id: string;
  company_name: string;
  cnpj: string;
  fiscal_automation_client: boolean;
}

interface FiscalNote {
  id: string;
  access_key: string;
  note_type: string;
  issue_date: string;
  value: number;
  status: string;
}

export const AccountantArea = () => {
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('2024-07');
  const [downloading, setDownloading] = useState(false);
  const { toast } = useToast();

  // Dados simulados para demonstração
  const companies: Company[] = [
    { id: '1', company_name: 'Tech Solutions Ltda', cnpj: '12.345.678/0001-90', fiscal_automation_client: true },
    { id: '2', company_name: 'Comercial ABC S/A', cnpj: '98.765.432/0001-10', fiscal_automation_client: true },
    { id: '3', company_name: 'Serviços Beta Eireli', cnpj: '11.222.333/0001-44', fiscal_automation_client: true }
  ];

  const sampleNotes: FiscalNote[] = [
    { id: '1', access_key: '35240612345678000190550010000000015123456789', note_type: 'NF-e', issue_date: '2024-07-15', value: 15000, status: 'issued' },
    { id: '2', access_key: '35240612345678000190550010000000025123456790', note_type: 'NFC-e', issue_date: '2024-07-20', value: 850, status: 'issued' },
    { id: '3', access_key: '35240612345678000190550010000000035123456791', note_type: 'NFS-e', issue_date: '2024-07-25', value: 3200, status: 'received' }
  ];

  const selectedCompanyData = companies.find(c => c.id === selectedCompany);

  const handleDownloadXmlBatch = async () => {
    if (!selectedCompany) {
      toast({
        title: "Erro",
        description: "Selecione uma empresa primeiro",
        variant: "destructive"
      });
      return;
    }

    setDownloading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Download Iniciado",
        description: `XMLs do período ${selectedPeriod} serão baixados em breve`,
      });
    } catch (err) {
      toast({
        title: "Erro no Download",
        description: "Falha ao gerar arquivo ZIP",
        variant: "destructive"
      });
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadPdfBatch = async () => {
    if (!selectedCompany) {
      toast({
        title: "Erro",
        description: "Selecione uma empresa primeiro",
        variant: "destructive"
      });
      return;
    }

    setDownloading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Download Iniciado",
        description: `PDFs do período ${selectedPeriod} serão baixados em breve`,
      });
    } catch (err) {
      toast({
        title: "Erro no Download",
        description: "Falha ao gerar arquivo ZIP",
        variant: "destructive"
      });
    } finally {
      setDownloading(false);
    }
  };

  const handleExportMonthlyReport = async () => {
    if (!selectedCompany) {
      toast({
        title: "Erro",
        description: "Selecione uma empresa primeiro",
        variant: "destructive"
      });
      return;
    }

    setDownloading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: "Relatório Gerado",
        description: `Relatório mensal de ${selectedPeriod} será baixado em breve`,
      });
    } catch (err) {
      toast({
        title: "Erro na Exportação",
        description: "Falha ao gerar relatório",
        variant: "destructive"
      });
    } finally {
      setDownloading(false);
    }
  };

  const generateMonthOptions = () => {
    const options = [];
    const currentDate = new Date();
    
    for (let i = 0; i < 12; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const value = format(date, 'yyyy-MM');
      const label = format(date, 'MMMM yyyy', { locale: ptBR });
      options.push({ value, label });
    }
    
    return options;
  };

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-3xl font-bold text-navy dark:text-white">
          Área do Contador
        </h1>
        <p className="text-muted-foreground mt-2">
          Acesso exclusivo para contadores - Gestão de documentos fiscais por cliente
        </p>
      </div>

      {/* Company Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Seleção de Cliente
          </CardTitle>
          <CardDescription>
            Escolha a empresa cliente para gerenciar os documentos fiscais
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Empresa Cliente</label>
              <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma empresa..." />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{company.company_name}</span>
                        <span className="text-sm text-muted-foreground">{company.cnpj}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Período (Mês/Ano)</label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {generateMonthOptions().map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedCompanyData && (
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{selectedCompanyData.company_name}</h3>
                  <p className="text-sm text-muted-foreground">CNPJ: {selectedCompanyData.cnpj}</p>
                </div>
                <Badge className="bg-green-100 text-green-800">
                  Cliente Automação Fiscal
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Downloads e Relatórios
          </CardTitle>
          <CardDescription>
            Baixe documentos e gere relatórios do período selecionado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button 
              onClick={handleDownloadXmlBatch}
              disabled={downloading || !selectedCompany}
              variant="outline"
              className="h-20 flex flex-col gap-2"
            >
              {downloading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <Archive className="h-6 w-6" />
              )}
              <span className="text-sm">XMLs do Mês</span>
            </Button>
            
            <Button 
              onClick={handleDownloadPdfBatch}
              disabled={downloading || !selectedCompany}
              variant="outline"
              className="h-20 flex flex-col gap-2"
            >
              {downloading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <Download className="h-6 w-6" />
              )}
              <span className="text-sm">PDFs do Mês</span>
            </Button>
            
            <Button 
              onClick={handleExportMonthlyReport}
              disabled={downloading || !selectedCompany}
              variant="outline"
              className="h-20 flex flex-col gap-2"
            >
              {downloading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-6 w-6" />
              )}
              <span className="text-sm">Relatório Mensal</span>
            </Button>

            <Button 
              disabled={true}
              variant="outline"
              className="h-20 flex flex-col gap-2 opacity-50"
            >
              <BookOpen className="h-6 w-6" />
              <span className="text-sm">SPED Fiscal</span>
              <span className="text-xs text-muted-foreground">(Em breve)</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notes Summary */}
      {selectedCompany && (
        <Card>
          <CardHeader>
            <CardTitle>Notas Fiscais do Período</CardTitle>
            <CardDescription>
              Resumo das notas fiscais de {selectedCompanyData?.company_name} em {format(new Date(selectedPeriod + '-01'), 'MMMM yyyy', { locale: ptBR })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-green-600">{sampleNotes.length}</div>
                <div className="text-sm text-muted-foreground">Total de Notas</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(sampleNotes.reduce((sum, note) => sum + note.value, 0))}
                </div>
                <div className="text-sm text-muted-foreground">Valor Total</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-gold">
                  {formatCurrency(sampleNotes.reduce((sum, note) => sum + note.value, 0) * 0.15)}
                </div>
                <div className="text-sm text-muted-foreground">Est. Impostos</div>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Chave de Acesso</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sampleNotes.map((note) => (
                  <TableRow key={note.id}>
                    <TableCell>
                      {format(new Date(note.issue_date), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{note.note_type}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {note.access_key.slice(-8)}...
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(note.value)}
                    </TableCell>
                    <TableCell>
                      <Badge className={note.status === 'issued' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
                        {note.status === 'issued' ? 'Emitida' : 'Recebida'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Future Features Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Funcionalidades Futuras</CardTitle>
          <CardDescription>
            Recursos em desenvolvimento para aprimorar a experiência do contador
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border border-dashed rounded-lg opacity-50">
              <h4 className="font-semibold mb-2">Geração de Livros Fiscais</h4>
              <p className="text-sm text-muted-foreground">
                Geração automática de livros fiscais e arquivos SPED a partir das notas processadas
              </p>
            </div>
            <div className="p-4 border border-dashed rounded-lg opacity-50">
              <h4 className="font-semibold mb-2">Análise de Conformidade</h4>
              <p className="text-sm text-muted-foreground">
                Verificação automática de conformidade fiscal e alertas de inconsistências
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};