import { useState, useEffect, useCallback, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, FileText, Save, Upload, Plus, Trash2, Search, FileSpreadsheet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useDropzone } from "react-dropzone";
import * as XLSX from "xlsx";

interface PlanoContasItem {
  codigo: string;
  descricao: string;
}

interface PlanoContasModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
}

// Parse legacy formats into the new structured format
const parseLegacyContent = (conteudo: string): PlanoContasItem[] => {
  try {
    const parsed = JSON.parse(conteudo);
    
    // Already in new format: [{codigo, descricao}]
    if (Array.isArray(parsed) && parsed.length > 0 && ('codigo' in parsed[0])) {
      return parsed;
    }
    
    // Legacy JSON format with 'Codigo reduzido'
    const items = Array.isArray(parsed) && parsed[0]?.data ? parsed[0].data : (Array.isArray(parsed) ? parsed : []);
    const result: PlanoContasItem[] = [];
    for (const item of items) {
      const code = String(item['Codigo reduzido'] || item['codigo_reduzido'] || item['CR'] || item['C.R.'] || '').trim();
      const desc = String(item['Descrição'] || item['descricao'] || item['Descrição da conta'] || '').trim();
      if (code) result.push({ codigo: code, descricao: desc });
    }
    return result;
  } catch {
    // Plain text fallback: try to parse lines like "370 - ATIVO"
    const lines = conteudo.split('\n').filter(l => l.trim());
    const result: PlanoContasItem[] = [];
    for (const line of lines) {
      const match = line.match(/^(\d[\d.]*)\s*[-–]\s*(.+)$/);
      if (match) {
        result.push({ codigo: match[1].trim(), descricao: match[2].trim() });
      }
    }
    return result;
  }
};

// Detect column mapping from XLSX headers
const detectColumns = (headers: string[]): { codigoIdx: number; descricaoIdx: number } | null => {
  const codigoVariations = ['c.r.', 'cr', 'c.r', 'codigo', 'código', 'codigo reduzido', 'código reduzido', 'numero', 'número', 'numero da conta', 'número da conta', 'conta', 'cod'];
  const descricaoVariations = ['descrição', 'descricao', 'descrição da conta', 'descricao da conta', 'nome', 'desc', 'desc.'];

  let codigoIdx = -1;
  let descricaoIdx = -1;

  for (let i = 0; i < headers.length; i++) {
    const h = String(headers[i] || '').toLowerCase().trim();
    if (codigoIdx === -1 && codigoVariations.some(v => h === v || h.includes(v))) {
      codigoIdx = i;
    }
    if (descricaoIdx === -1 && descricaoVariations.some(v => h === v || h.includes(v))) {
      descricaoIdx = i;
    }
  }

  if (codigoIdx !== -1 && descricaoIdx !== -1) {
    return { codigoIdx, descricaoIdx };
  }
  return null;
};

export const PlanoContasModal = ({ isOpen, onClose, clientId, clientName }: PlanoContasModalProps) => {
  const { user } = useAuth();
  const [items, setItems] = useState<PlanoContasItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (isOpen && clientId) {
      fetchPlanoContas();
      setSearchTerm("");
    }
  }, [isOpen, clientId]);

  const fetchPlanoContas = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('planos_contas')
        .select('id, conteudo')
        .eq('user_id', clientId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setItems(parseLegacyContent(data.conteudo));
        setExistingId(data.id);
      } else {
        setItems([]);
        setExistingId(null);
      }
    } catch (error) {
      console.error('Error fetching plano de contas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportXlsx = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        if (rows.length < 2) {
          toast.error("Planilha vazia ou sem dados suficientes");
          return;
        }

        // Find header row (first row with recognizable columns)
        let headerRowIdx = -1;
        let columns: { codigoIdx: number; descricaoIdx: number } | null = null;

        for (let i = 0; i < Math.min(5, rows.length); i++) {
          const detected = detectColumns(rows[i].map(String));
          if (detected) {
            headerRowIdx = i;
            columns = detected;
            break;
          }
        }

        if (!columns || headerRowIdx === -1) {
          toast.error("Não foi possível identificar as colunas 'C.R.' e 'Descrição' na planilha");
          return;
        }

        const imported: PlanoContasItem[] = [];
        for (let i = headerRowIdx + 1; i < rows.length; i++) {
          const row = rows[i];
          const codigo = String(row[columns.codigoIdx] || '').trim();
          const descricao = String(row[columns.descricaoIdx] || '').trim();
          if (codigo) {
            imported.push({ codigo, descricao });
          }
        }

        if (imported.length === 0) {
          toast.error("Nenhuma conta encontrada na planilha");
          return;
        }

        setItems(imported);
        toast.success(`${imported.length} contas importadas com sucesso!`);
      } catch (err) {
        console.error('Error importing XLSX:', err);
        toast.error("Erro ao ler a planilha");
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive, open: openFileDialog } = useDropzone({
    onDrop: handleImportXlsx,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    multiple: false,
    noClick: true,
    noKeyboard: true,
  });

  const handleSave = async () => {
    if (items.length === 0) {
      toast.error("O plano de contas não pode estar vazio");
      return;
    }

    setIsSaving(true);
    try {
      const conteudo = JSON.stringify(items);

      if (existingId) {
        const { error } = await supabase
          .from('planos_contas')
          .update({ conteudo, updated_at: new Date().toISOString() })
          .eq('id', existingId);
        if (error) throw error;
        toast.success("Plano de contas atualizado!");
      } else {
        const { error } = await supabase
          .from('planos_contas')
          .insert({ user_id: clientId, conteudo, created_by: user?.id });
        if (error) throw error;
        toast.success("Plano de contas cadastrado!");
      }

      onClose();
    } catch (error: any) {
      console.error('Error saving plano de contas:', error);
      toast.error("Erro ao salvar plano de contas");
    } finally {
      setIsSaving(false);
    }
  };

  const addRow = () => {
    setItems(prev => [...prev, { codigo: '', descricao: '' }]);
  };

  const removeRow = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, field: 'codigo' | 'descricao', value: string) => {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return items;
    const term = searchTerm.toLowerCase();
    return items.filter(item =>
      item.codigo.toLowerCase().includes(term) ||
      item.descricao.toLowerCase().includes(term)
    );
  }, [items, searchTerm]);

  const isFiltered = searchTerm.trim().length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Plano de Contas - {clientName}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div {...getRootProps()} className={`flex-1 overflow-hidden flex flex-col min-h-0 ${isDragActive ? 'ring-2 ring-primary ring-offset-2 rounded-lg' : ''}`}>
            <input {...getInputProps()} />
            
            {/* Toolbar */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <Button variant="outline" size="sm" onClick={openFileDialog}>
                <Upload className="h-4 w-4 mr-1" />
                Importar XLSX
              </Button>
              <Button variant="outline" size="sm" onClick={addRow}>
                <Plus className="h-4 w-4 mr-1" />
                Adicionar Linha
              </Button>
              <div className="flex-1" />
              <div className="relative">
                <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar conta..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-9 w-52"
                />
              </div>
            </div>

            {isDragActive && (
              <div className="border-2 border-dashed border-primary rounded-lg p-8 text-center mb-3 bg-primary/5">
                <FileSpreadsheet className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="text-sm text-primary font-medium">Solte o arquivo XLSX aqui</p>
              </div>
            )}

            {/* Table */}
            <div className="flex-1 overflow-auto border rounded-lg min-h-0">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm z-10">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium w-[140px]">Nº da Conta</th>
                    <th className="text-left px-3 py-2 font-medium">Descrição</th>
                    <th className="w-10 px-2 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="text-center py-12 text-muted-foreground">
                        {isFiltered ? 'Nenhuma conta encontrada' : 'Nenhuma conta cadastrada. Importe um arquivo XLSX ou adicione manualmente.'}
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item, displayIdx) => {
                      // Find real index in items array for editing
                      const realIdx = isFiltered ? items.indexOf(item) : displayIdx;
                      return (
                        <tr key={realIdx} className="border-t border-border/50 hover:bg-muted/30">
                          <td className="px-2 py-1">
                            <Input
                              value={item.codigo}
                              onChange={(e) => updateRow(realIdx, 'codigo', e.target.value)}
                              className="h-8 text-xs font-mono border-0 bg-transparent shadow-none focus:ring-1"
                              placeholder="Ex: 370"
                            />
                          </td>
                          <td className="px-2 py-1">
                            <Input
                              value={item.descricao}
                              onChange={(e) => updateRow(realIdx, 'descricao', e.target.value)}
                              className="h-8 text-xs border-0 bg-transparent shadow-none focus:ring-1"
                              placeholder="Ex: ATIVO"
                            />
                          </td>
                          <td className="px-1 py-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => removeRow(realIdx)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-muted-foreground mt-2">
              {items.length} conta(s) cadastrada(s)
              {isFiltered && ` • ${filteredItems.length} exibida(s)`}
            </p>
          </div>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isLoading}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {existingId ? 'Atualizar' : 'Salvar'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
