import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useFiscalData } from '@/hooks/fiscal/useFiscalData';
import { Loader2, Search, Download, FileText, Archive, FileSpreadsheet, Calendar } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import { format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

export const EnhancedFiscalNotesList = () => {
  const { fiscalNotes, loading, error, refetch } = useFiscalData();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [periodFilter, setPeriodFilter] = useState('month');
  const [downloading, setDownloading] = useState(false);
  const { toast } = useToast();
  const itemsPerPage = 10;

  const filteredNotes = fiscalNotes.filter(note => {
    const matchesSearch = note.access_key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.issuer_cnpj.includes(searchTerm) ||
      note.recipient_cnpj.includes(searchTerm) ||
      note.note_type.toLowerCase().includes(searchTerm.toLowerCase());

    // Filter by period
    const now = new Date();
    let startDate, endDate;
    
    switch (periodFilter) {
      case 'quarter':
        startDate = startOfQuarter(now);
        endDate = endOfQuarter(now);
        break;
      case 'year':
        startDate = startOfYear(now);
        endDate = endOfYear(now);
        break;
      default:
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
    }

    const noteDate = new Date(note.issue_date);
    return matchesSearch && noteDate >= startDate && noteDate <= endDate;
  });

  const totalPages = Math.ceil(filteredNotes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedNotes = filteredNotes.slice(startIndex, startIndex + itemsPerPage);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'issued': return 'bg-green-100 text-green-800';
      case 'received': return 'bg-blue-100 text-blue-800';
      case 'canceled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleDownloadXml = (note: any) => {
    if (note.xml_url) {
      window.open(note.xml_url, '_blank');
    }
  };

  const handleDownloadPdf = (note: any) => {
    if (note.pdf_url) {
      window.open(note.pdf_url, '_blank');
    }
  };

  const handleBulkDownloadXml = async () => {
    setDownloading(true);
    try {
      // Simular download em lote de XMLs
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Download Iniciado",
        description: `ZIP com ${filteredNotes.length} XMLs será baixado em breve`,
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

  const handleBulkDownloadPdf = async () => {
    setDownloading(true);
    try {
      // Simular download em lote de PDFs
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Download Iniciado",
        description: `ZIP com ${filteredNotes.length} PDFs será baixado em breve`,
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

  const handleExportReport = async () => {
    setDownloading(true);
    try {
      // Simular exportação de relatório
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: "Relatório Gerado",
        description: "Arquivo Excel será baixado em breve",
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={refetch} variant="outline">
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-navy dark:text-white">Notas Fiscais</h1>
        <div className="flex gap-2">
          <Select value={periodFilter} onValueChange={setPeriodFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Mês</SelectItem>
              <SelectItem value="quarter">Trimestre</SelectItem>
              <SelectItem value="year">Ano</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={refetch} variant="outline" size="sm">
            Atualizar
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros e Busca</CardTitle>
          <CardDescription>
            Pesquise e filtre notas fiscais por período
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar notas fiscais..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Ações em Lote</CardTitle>
          <CardDescription>
            Download e exportação de múltiplas notas fiscais
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            <Button 
              onClick={handleBulkDownloadXml}
              disabled={downloading || filteredNotes.length === 0}
              variant="outline"
            >
              {downloading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Archive className="h-4 w-4 mr-2" />
              )}
              Baixar XMLs do Período
            </Button>
            
            <Button 
              onClick={handleBulkDownloadPdf}
              disabled={downloading || filteredNotes.length === 0}
              variant="outline"
            >
              {downloading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Baixar PDFs do Período
            </Button>
            
            <Button 
              onClick={handleExportReport}
              disabled={downloading || filteredNotes.length === 0}
              variant="outline"
            >
              {downloading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-4 w-4 mr-2" />
              )}
              Exportar Relatório (Excel)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notes Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Notas Fiscais</CardTitle>
          <CardDescription>
            {filteredNotes.length} nota(s) encontrada(s) no período selecionado
          </CardDescription>
        </CardHeader>
        <CardContent>
          {paginatedNotes.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Chave de Acesso</TableHead>
                    <TableHead>Emitente</TableHead>
                    <TableHead>Destinatário</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedNotes.map((note) => (
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
                      <TableCell className="font-mono text-sm">
                        {note.issuer_cnpj}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {note.recipient_cnpj}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(note.value)}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(note.status)}>
                          {note.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownloadXml(note)}
                            disabled={!note.xml_url}
                            title="Baixar XML"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownloadPdf(note)}
                            disabled={!note.pdf_url}
                            title="Baixar PDF"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    Anterior
                  </Button>
                  
                  <span className="flex items-center px-4 text-sm text-muted-foreground">
                    Página {currentPage} de {totalPages}
                  </span>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    Próxima
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'Nenhuma nota fiscal encontrada para sua pesquisa' : 'Nenhuma nota fiscal encontrada no período'}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};