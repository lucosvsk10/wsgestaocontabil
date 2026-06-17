import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clientId: string;
  onSaved?: () => void;
}

interface MappingRow {
  id?: string;
  cfop: string;
  descricao: string;
  conta_debito: string;
  conta_credito: string;
  ativo_padrao: boolean;
}

const emptyRow = (): MappingRow => ({
  cfop: "", descricao: "", conta_debito: "", conta_credito: "777", ativo_padrao: true,
});

export const CfopMappingDialog = ({ open, onOpenChange, clientId, onSaved }: Props) => {
  const [rows, setRows] = useState<MappingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("compras_cfop_mapping").select("*")
      .eq("client_id", clientId).order("cfop", { ascending: true });
    if (error) toast.error(error.message);
    setRows((data || []) as MappingRow[]);
    setLoading(false);
  }, [clientId]);

  useEffect(() => { if (open) load(); }, [open, load]);

  const updateRow = (i: number, patch: Partial<MappingRow>) =>
    setRows((r) => r.map((row, idx) => idx === i ? { ...row, ...patch } : row));

  const removeRow = async (i: number) => {
    const row = rows[i];
    if (row.id) {
      const { error } = await supabase.from("compras_cfop_mapping").delete().eq("id", row.id);
      if (error) { toast.error(error.message); return; }
    }
    setRows((r) => r.filter((_, idx) => idx !== i));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const r of rows) {
        if (!r.cfop || !r.conta_debito || !r.conta_credito) continue;
        const payload = {
          client_id: clientId,
          cfop: r.cfop.trim(),
          descricao: r.descricao?.trim() || null,
          conta_debito: r.conta_debito.trim(),
          conta_credito: r.conta_credito.trim(),
          ativo_padrao: r.ativo_padrao,
        };
        if (r.id) {
          const { error } = await supabase.from("compras_cfop_mapping").update(payload).eq("id", r.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("compras_cfop_mapping").upsert(payload, {
            onConflict: "client_id,cfop",
          });
          if (error) throw error;
        }
      }
      toast.success("Mapeamento salvo");
      onSaved?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Mapear CFOPs do cliente</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 inline animate-spin mr-2" />Carregando...
          </div>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[90px]">CFOP</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="w-[110px]">Cta. Débito</TableHead>
                  <TableHead className="w-[110px]">Cta. Crédito</TableHead>
                  <TableHead className="w-[110px] text-center">Padrão</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-6">
                      Nenhum CFOP mapeado ainda.
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((r, i) => (
                  <TableRow key={r.id || i}>
                    <TableCell>
                      <Input value={r.cfop} onChange={(e) => updateRow(i, { cfop: e.target.value })} className="h-8" placeholder="1101" />
                    </TableCell>
                    <TableCell>
                      <Input value={r.descricao} onChange={(e) => updateRow(i, { descricao: e.target.value })} className="h-8" placeholder="Descrição" />
                    </TableCell>
                    <TableCell>
                      <Input value={r.conta_debito} onChange={(e) => updateRow(i, { conta_debito: e.target.value })} className="h-8" placeholder="493" />
                    </TableCell>
                    <TableCell>
                      <Input value={r.conta_credito} onChange={(e) => updateRow(i, { conta_credito: e.target.value })} className="h-8" placeholder="777" />
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch checked={r.ativo_padrao} onCheckedChange={(v) => updateRow(i, { ativo_padrao: v })} />
                    </TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => removeRow(i)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <div>
          <Button variant="outline" size="sm" onClick={() => setRows((r) => [...r, emptyRow()])}>
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Adicionar CFOP
          </Button>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
