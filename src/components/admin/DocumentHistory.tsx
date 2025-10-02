/**
 * HISTÓRICO DE LANÇAMENTOS - Admin
 * 
 * IMPORTANTE N8N CONFIG:
 * - Endpoint GET deve aceitar query params: clientId, month, docType
 * - Requer header: x-api-key: ADMIN_TOKEN
 * - Retornar JSON array com: timestamp, clientId, fileName, docType, month, status, storageUrl, protocolId
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileText, Search, Download, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Webhook do n8n - TROCAR AQUI se necessário
const WEBHOOK_LIST_URL = "https://pre-studiolx-n8n.zmdnad.easypanel.host/webhook/ws-site-list";

// TROCAR API_KEY conforme configurado no n8n
const API_KEY = "ADMIN_TOKEN";

interface DocumentRecord {
  timestamp: string;
  clientId: string;
  fileName: string;
  docType: string;
  month: string;
  status: string;
  storageUrl?: string;
  protocolId?: string;
}

export const DocumentHistory = () => {
  const { toast } = useToast();
  const [records, setRecords] = useState<DocumentRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<DocumentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filtros
  const [filterClientId, setFilterClientId] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterDocType, setFilterDocType] = useState("");

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const fetchRecords = async () => {
    setIsLoading(true);
    try {
      // Construir query params
      const params = new URLSearchParams();
      if (filterClientId) params.append('clientId', filterClientId);
      if (filterMonth) params.append('month', filterMonth);
      if (filterDocType) params.append('docType', filterDocType);

      const url = `${WEBHOOK_LIST_URL}?${params.toString()}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'x-api-key': API_KEY,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Assumir que retorna array de registros
      const recordsArray = Array.isArray(data) ? data : data.records || [];
      
      setRecords(recordsArray);
      setFilteredRecords(recordsArray);

      toast({
        title: "Dados carregados",
        description: `${recordsArray.length} registro(s) encontrado(s)`
      });

    } catch (error: any) {
      console.error('Erro ao buscar registros:', error);
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive"
      });
      setRecords([]);
      setFilteredRecords([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleSearch = () => {
    fetchRecords();
    setCurrentPage(1);
  };

  const handleReset = () => {
    setFilterClientId("");
    setFilterMonth("");
    setFilterDocType("");
    setCurrentPage(1);
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'success':
      case 'ok':
        return <Badge className="bg-green-500">Sucesso</Badge>;
      case 'error':
      case 'failed':
        return <Badge variant="destructive">Erro</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pendente</Badge>;
      default:
        return <Badge variant="outline">{status || 'N/A'}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy HH:mm", { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  // Paginação
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRecords = filteredRecords.slice(startIndex, endIndex);

  return (
    <div className="container mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-6 h-6" />
            Histórico de Lançamentos
          </CardTitle>
          <CardDescription>
            Visualize todos os documentos enviados pelos clientes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="filterClientId">ID do Cliente</Label>
              <Input
                id="filterClientId"
                placeholder="UUID do cliente"
                value={filterClientId}
                onChange={(e) => setFilterClientId(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="filterMonth">Mês</Label>
              <Input
                id="filterMonth"
                type="month"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="filterDocType">Tipo de Documento</Label>
              <Select value={filterDocType || "all"} onValueChange={(value) => setFilterDocType(value === "all" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="Extrato">Extrato</SelectItem>
                  <SelectItem value="Comprovante">Comprovante</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <div className="flex gap-2">
                <Button onClick={handleSearch} disabled={isLoading} className="flex-1">
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </Button>
                <Button variant="outline" onClick={handleReset} disabled={isLoading}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Contador de resultados */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {filteredRecords.length} registro(s) encontrado(s)
              {totalPages > 1 && ` - Página ${currentPage} de ${totalPages}`}
            </span>
          </div>

          {/* Tabela */}
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>ID Cliente</TableHead>
                    <TableHead>Arquivo</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Mês</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Protocolo</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                        <p className="text-muted-foreground">Carregando dados...</p>
                      </TableCell>
                    </TableRow>
                  ) : paginatedRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        Nenhum registro encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedRecords.map((record, index) => (
                      <TableRow key={index}>
                        <TableCell className="whitespace-nowrap">
                          {formatDate(record.timestamp)}
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-1 py-0.5 rounded">
                            {record.clientId?.substring(0, 8)}...
                          </code>
                        </TableCell>
                        <TableCell className="max-w-xs truncate" title={record.fileName}>
                          {record.fileName}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{record.docType}</Badge>
                        </TableCell>
                        <TableCell>{record.month}</TableCell>
                        <TableCell>{getStatusBadge(record.status)}</TableCell>
                        <TableCell>
                          {record.protocolId && (
                            <code className="text-xs bg-muted px-1 py-0.5 rounded">
                              {record.protocolId?.substring(0, 8)}
                            </code>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {record.storageUrl && (
                            <Button
                              variant="ghost"
                              size="sm"
                              asChild
                            >
                              <a
                                href={record.storageUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1"
                              >
                                <ExternalLink className="w-4 h-4" />
                                Abrir
                              </a>
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                Página {currentPage} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Próxima
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
