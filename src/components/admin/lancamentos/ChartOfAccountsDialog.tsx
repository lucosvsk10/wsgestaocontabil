import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ChartAccount, readChartOfAccounts } from "@/lib/lancamentos/chartOfAccounts";
import { loadWorkspaceData, saveWorkspaceData } from "@/lib/lancamentos/workspaceStorage";

interface ChartOfAccountsDialogProps {
  company: string;
}

export function ChartOfAccountsDialog({ company }: ChartOfAccountsDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [accounts, setAccounts] = useState<ChartAccount[]>([]);
  const [preview, setPreview] = useState<ChartAccount[]>([]);
  const [query, setQuery] = useState("");
  const [fileName, setFileName] = useState("");
  const storageKey = `${company}:chart-of-accounts`;

  useEffect(() => {
    void loadWorkspaceData<ChartAccount[]>(storageKey).then((saved) => saved && setAccounts(saved));
  }, [storageKey]);

  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("pt-BR");
    if (!term) return accounts;
    return accounts.filter((account) => [account.account, account.reducedCode, account.description].some((value) => value.toLocaleLowerCase("pt-BR").includes(term)));
  }, [accounts, query]);

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setPreview(await readChartOfAccounts(file));
    setFileName(file.name);
  };

  const confirm = async () => {
    const unique = new Map(preview.map((account) => [account.reducedCode || account.account, account]));
    const next = Array.from(unique.values());
    setAccounts(next);
    await saveWorkspaceData(storageKey, next);
    setPreview([]);
    setFileName("");
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-10 border-border bg-transparent px-4 text-foreground shadow-none hover:bg-muted dark:border-white/15 dark:hover:bg-white/5">Plano de contas</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[88vh] max-w-[1180px] overflow-hidden border-border bg-background p-0 text-foreground dark:border-white/15">
        <DialogHeader className="border-b border-border px-6 py-5 text-left">
          <DialogTitle>Plano de contas da empresa</DialogTitle>
          <p className="text-sm text-muted-foreground">O C.R. e a descrição serão as referências usadas para identificar débito e crédito.</p>
        </DialogHeader>
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar conta, C.R. ou descrição" className="max-w-md border-border bg-transparent shadow-none" />
          <Button variant="outline" onClick={() => inputRef.current?.click()} className="border-border bg-transparent text-foreground shadow-none hover:bg-muted dark:border-white/15">Importar XLSX ou CSV</Button>
          <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="sr-only" onChange={handleFile} />
        </div>

        {preview.length > 0 && (
          <div className="mx-6 mb-4 rounded-md border border-border">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3"><div><p className="text-sm font-medium">Prévia de {fileName}</p><p className="text-xs text-muted-foreground">{preview.length} contas encontradas · exibindo as cinco primeiras</p></div><div className="flex gap-2"><Button variant="outline" onClick={() => setPreview([])} className="border-border bg-transparent">Cancelar</Button><Button onClick={confirm} className="bg-foreground text-background hover:bg-foreground/90">Confirmar importação</Button></div></div>
            <AccountTable accounts={preview.slice(0, 5)} compact />
          </div>
        )}

        <div className="max-h-[56vh] overflow-auto border-t border-border">
          <AccountTable accounts={filtered} />
        </div>
        <div className="border-t border-border px-6 py-3 text-xs text-muted-foreground">{accounts.length} contas armazenadas para esta empresa</div>
      </DialogContent>
    </Dialog>
  );
}

function AccountTable({ accounts, compact = false }: { accounts: ChartAccount[]; compact?: boolean }) {
  return (
    <table className="w-full min-w-[820px] border-collapse text-sm">
      <thead className="sticky top-0 bg-muted text-left text-xs text-muted-foreground"><tr><th className="border-b border-r border-border px-3 py-2 font-medium">Conta</th><th className="w-28 border-b border-r border-border px-3 py-2 font-medium">Analítica</th><th className="w-28 border-b border-r border-border px-3 py-2 font-medium">C.R.</th><th className="border-b border-r border-border px-3 py-2 font-medium">Descrição</th><th className="w-36 border-b border-border px-3 py-2 font-medium">SPED ECD/ECF</th></tr></thead>
      <tbody>
        {accounts.map((account) => <tr key={account.id} className="border-b border-border last:border-b-0"><td className="border-r border-border px-3 py-2 tabular-nums">{account.account}</td><td className="border-r border-border px-3 py-2">{account.analytical ? "Sim" : "Não"}</td><td className="border-r border-border px-3 py-2 tabular-nums">{account.reducedCode}</td><td className="border-r border-border px-3 py-2">{account.description}</td><td className="px-3 py-2">{account.sped ? "Sim" : "Não"}</td></tr>)}
        {!accounts.length && !compact && <tr><td colSpan={5} className="h-40 px-4 text-center text-muted-foreground">Nenhum plano de contas importado para esta empresa.</td></tr>}
      </tbody>
    </table>
  );
}
