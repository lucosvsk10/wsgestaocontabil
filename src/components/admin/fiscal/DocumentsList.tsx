
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Search, Filter, Calendar, Building2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useFiscalDocuments } from "@/hooks/fiscal/useFiscalDocuments";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const DocumentsList = () => {
  const [filters, setFilters] = useState({
    search: '',
    tipo: 'all',
    operacao: 'all',
    dateRange: null,
    company: 'all'
  });

  const { documents, companies, isLoading, downloadDocument, downloadReport } = useFiscalDocuments(filters);

  const getDocumentTypeColor = (type: string) => {
    const colors = {
      'NFe': 'bg-blue-500',
      'NFCe': 'bg-green-500',
      'NFSe': 'bg-yellow-500',
      'CTe': 'bg-purple-500',
      'MDFe': 'bg-red-500'
    };
    return colors[type] || 'bg-gray-500';
  };

  const getOperationColor = (operation: string) => {
    return operation === 'entrada' ? 'bg-red-500' : 'bg-green-500';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#020817] dark:text-white">
            Documentos Fiscais
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Visualize e gerencie todos os documentos coletados
          </p>
        </div>
        <Button
          onClick={() => downloadReport(filters)}
          className="bg-[#efc349] hover:bg-[#efc349]/90 text-[#020817]"
        >
          <Download className="w-4 h-4 mr-2" />
          Relatório
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-white/80 dark:bg-[#020817]/80 backdrop-blur-sm border-[#efc349]/20">
        <CardHeader>
          <CardTitle className="text-[#020817] dark:text-white flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            Filtros
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            Filtre os documentos por critérios específicos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search" className="text-[#020817] dark:text-white">
                Buscar
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="search"
                  placeholder="Chave, número, CNPJ..."
                  value={filters.search}
                  onChange={(e) => setFilters({...filters, search: e.target.value})}
                  className="pl-10 border-[#efc349]/20 focus:border-[#efc349]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[#020817] dark:text-white">
                Tipo de Documento
              </Label>
              <Select value={filters.tipo} onValueChange={(value) => setFilters({...filters, tipo: value})}>
                <SelectTrigger className="border-[#efc349]/20 focus:border-[#efc349]">
                  <SelectValue placeholder="Todos os tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="NFe">NF-e</SelectItem>
                  <SelectItem value="NFCe">NFC-e</SelectItem>
                  <SelectItem value="NFSe">NFS-e</SelectItem>
                  <SelectItem value="CTe">CT-e</SelectItem>
                  <SelectItem value="MDFe">MDF-e</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[#020817] dark:text-white">
                Operação
              </Label>
              <Select value={filters.operacao} onValueChange={(value) => setFilters({...filters, operacao: value})}>
                <SelectTrigger className="border-[#efc349]/20 focus:border-[#efc349]">
                  <SelectValue placeholder="Todas operações" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas operações</SelectItem>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="saida">Saída</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[#020817] dark:text-white">
                Empresa
              </Label>
              <Select value={filters.company} onValueChange={(value) => setFilters({...filters, company: value})}>
                <SelectTrigger className="border-[#efc349]/20 focus:border-[#efc349]">
                  <SelectValue placeholder="Todas empresas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas empresas</SelectItem>
                  {companies.map(company => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.razao_social}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[#020817] dark:text-white">
                Período
              </Label>
              <DatePickerWithRange
                date={filters.dateRange}
                setDate={(date) => setFilters({...filters, dateRange: date})}
                className="border-[#efc349]/20 focus:border-[#efc349]"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents Table */}
      <Card className="bg-white/80 dark:bg-[#020817]/80 backdrop-blur-sm border-[#efc349]/20">
        <CardHeader>
          <CardTitle className="text-[#020817] dark:text-white">
            Documentos Encontrados
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            {documents.length} documento(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#efc349]"></div>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-[#020817] dark:text-white mb-2">
                Nenhum documento encontrado
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Ajuste os filtros ou sincronize mais documentos
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[#020817] dark:text-white">Tipo</TableHead>
                    <TableHead className="text-[#020817] dark:text-white">Número</TableHead>
                    <TableHead className="text-[#020817] dark:text-white">Data</TableHead>
                    <TableHead className="text-[#020817] dark:text-white">Operação</TableHead>
                    <TableHead className="text-[#020817] dark:text-white">Emitente</TableHead>
                    <TableHead className="text-[#020817] dark:text-white">Valor</TableHead>
                    <TableHead className="text-[#020817] dark:text-white">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <Badge 
                          className={`${getDocumentTypeColor(doc.tipo_documento)} text-white`}
                        >
                          {doc.tipo_documento}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-[#020817] dark:text-white">
                        {doc.numero_nota}/{doc.serie}
                      </TableCell>
                      <TableCell className="text-[#020817] dark:text-white">
                        {format(new Date(doc.data_emissao), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          className={`${getOperationColor(doc.tipo_operacao)} text-white`}
                        >
                          {doc.tipo_operacao === 'entrada' ? 'Entrada' : 'Saída'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[#020817] dark:text-white">
                        <div>
                          <p className="font-medium">{doc.nome_emitente}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                            {doc.cnpj_emitente}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-[#020817] dark:text-white font-mono">
                        R$ {doc.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => downloadDocument(doc.id, 'xml')}
                            className="border-[#efc349]/20 text-[#020817] dark:text-white"
                          >
                            XML
                          </Button>
                          {doc.pdf_url && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => downloadDocument(doc.id, 'pdf')}
                              className="border-[#efc349]/20 text-[#020817] dark:text-white"
                            >
                              PDF
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DocumentsList;
