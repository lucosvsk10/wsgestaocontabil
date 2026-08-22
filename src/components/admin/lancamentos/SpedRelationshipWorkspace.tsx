import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Download, Loader2, RefreshCw, Upload } from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { ChartAccount } from "@/lib/lancamentos/chartOfAccounts";
import { groupFromAccountCode, groupLabel, referentialRootForWsGroup } from "@/lib/lancamentos/accountPlanProfile";
import { AccountCostCenterRule, CostCenter } from "@/lib/lancamentos/costCenters";
import { candidatesForSpedAccount, generateAutomaticSpedMappings, GeneratedSpedRelationship } from "@/lib/lancamentos/spedAutoMapping";
import { readSpedRelationshipFiles, SpedReferentialAccount, SpedRelationship } from "@/lib/lancamentos/spedRelationships";
import { loadWorkspaceData, saveWorkspaceData } from "@/lib/lancamentos/workspaceStorage";

export function SpedRelationshipWorkspace({ company }: { company: string }) {
  const referenceInputRef = useRef<HTMLInputElement>(null);
  const [accounts, setAccounts] = useState<ChartAccount[]>([]);
  const [centers, setCenters] = useState<CostCenter[]>([]);
  const [costCenterRules, setCostCenterRules] = useState<AccountCostCenterRule[]>([]);
  const [relationships, setRelationships] = useState<SpedRelationship[]>([]);
  const [referentialAccounts, setReferentialAccounts] = useState<SpedReferentialAccount[]>([]);
  const [query, setQuery] = useState("");
  const [mapping, setMapping] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<string | null>(null);

  const relationshipsKey = `${company}:sped-relationships`;
  const referentialKey = `${company}:sped-referential-accounts`;

  useEffect(() => {
    let active = true;
    void Promise.all([
      loadWorkspaceData<ChartAccount[]>(`${company}:chart-of-accounts`),
      loadWorkspaceData<CostCenter[]>(`${company}:cost-centers`),
      loadWorkspaceData<AccountCostCenterRule[]>(`${company}:account-cost-center-rules`),
      loadWorkspaceData<SpedRelationship[]>(relationshipsKey),
      loadWorkspaceData<SpedReferentialAccount[]>(referentialKey),
    ]).then(([savedAccounts, savedCenters, savedRules, savedRelationships, savedReferential]) => {
      if (!active) return;
      setAccounts(savedAccounts ?? []);
      setCenters(savedCenters ?? []);
      setCostCenterRules(savedRules ?? []);
      setRelationships(savedRelationships ?? []);
      setReferentialAccounts(savedReferential ?? []);
    });
    return () => { active = false; };
  }, [company, referentialKey, relationshipsKey]);

  const targetAccounts = useMemo(() => accounts.filter(account =>
    account.analytical
    && account.reducedCode
    && referentialRootForWsGroup(groupFromAccountCode(account.account)),
  ), [accounts]);

  const filteredAccounts = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("pt-BR");
    return targetAccounts.filter(account => !term || `${account.account} ${account.reducedCode} ${account.description}`.toLocaleLowerCase("pt-BR").includes(term));
  }, [query, targetAccounts]);

  const ruleMap = useMemo(() => new Map(costCenterRules.map(rule => [rule.accountReducedCode, rule])), [costCenterRules]);
  const centerMap = useMemo(() => new Map(centers.map(center => [center.reducedCode, center])), [centers]);
  const referenceMap = useMemo(() => new Map(referentialAccounts.map(reference => [reference.code, reference])), [referentialAccounts]);

  const relationshipMap = useMemo(() => {
    const map = new Map<string, SpedRelationship>();
    relationships.forEach(relation => {
      const previous = map.get(relation.accountReducedCode);
      if (!previous || relation.source === "manual") map.set(relation.accountReducedCode, relation);
    });
    return map;
  }, [relationships]);

  const mappedCount = targetAccounts.filter(account => relationshipMap.has(account.reducedCode)).length;
  const pendingCount = Math.max(0, targetAccounts.length - mappedCount);

  const generateBridge = async () => {
    setError("");
    setSummary(null);
    setMapping(true);
    try {
      const result = await generateAutomaticSpedMappings(company, accounts, referentialAccounts);
      const manual = new Map(
        relationships
          .filter(relation => relation.source === "manual")
          .map(relation => [relation.accountReducedCode, relation]),
      );

      const generated = result.relationships.map(relation => {
        const manualRelation = manual.get(relation.accountReducedCode);
        if (manualRelation) return manualRelation;
        return {
          ...relation,
          costCenterReducedCode: ruleMap.get(relation.accountReducedCode)?.costCenterReducedCode || "",
        };
      });

      const next = Array.from(new Map(generated.map(relation => [relation.accountReducedCode, relation])).values());
      const saveResult = await saveWorkspaceData(relationshipsKey, next);
      setRelationships(next);
      if (!saveResult.synced) throw new Error(saveResult.error || "O relacionamento não foi sincronizado com o banco.");

      const text = `${next.length} contas relacionadas. ${result.unresolved.length} ficaram sem referência.`;
      setSummary(text);
      toast({ title: "Relacionamento concluído", description: text });
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Não foi possível gerar o relacionamento.";
      setError(message);
      toast({ title: "Falha no relacionamento", description: message, variant: "destructive" });
    } finally {
      setMapping(false);
    }
  };

  const updateReference = async (account: ChartAccount, referentialCode: string) => {
    const current = relationshipMap.get(account.reducedCode);
    const costCenterReducedCode = ruleMap.get(account.reducedCode)?.costCenterReducedCode || current?.costCenterReducedCode || "";
    const next = relationships.filter(relation => relation.accountReducedCode !== account.reducedCode);

    if (referentialCode) {
      next.push({
        id: `manual-${crypto.randomUUID()}`,
        accountReducedCode: account.reducedCode,
        accountCode: account.account,
        costCenterReducedCode,
        referentialCode,
        source: "manual",
      });
    }

    setRelationships(next);
    await saveWorkspaceData(relationshipsKey, next);
  };

  const importReferenceBase = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;
    setError("");
    try {
      const parsed = await readSpedRelationshipFiles(files);
      if (!parsed.referentialAccounts.length) throw new Error("Nenhuma conta do Plano Referencial foi reconhecida nesse arquivo.");
      const next = Array.from(new Map(parsed.referentialAccounts.map(reference => [reference.code, reference])).values());
      await saveWorkspaceData(referentialKey, next);
      setReferentialAccounts(next);
      toast({ title: "Plano Referencial carregado", description: `${next.length} contas da base referencial disponíveis.` });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível ler o Plano Referencial.");
    }
  };

  const exportFile = () => {
    const rows = targetAccounts
      .map(account => {
        const relation = relationshipMap.get(account.reducedCode);
        if (!relation?.referentialCode) return null;
        const reference = referenceMap.get(relation.referentialCode);
        const centerCode = relation.costCenterReducedCode || ruleMap.get(account.reducedCode)?.costCenterReducedCode || "";
        const center = centerCode ? centerMap.get(centerCode) : null;
        return {
          "C.R.": account.reducedCode,
          "Conta Contábil": account.account,
          "Descrição da Conta": account.description,
          "Centro de Custo": centerCode,
          "Descrição do Centro de Custo": center?.description || "",
          "Conta Referencial": relation.referentialCode,
          "Descrição Referencial": reference?.description || "",
        };
      })
      .filter(Boolean);

    if (!rows.length) {
      setError("Gere o relacionamento antes de exportar o arquivo.");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet["!cols"] = [
      { wch: 14 }, { wch: 24 }, { wch: 42 }, { wch: 18 }, { wch: 32 }, { wch: 24 }, { wch: 52 },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Relacionamento");
    const safeCompany = company.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/-+/g, "-");
    XLSX.writeFile(workbook, `relacionamento-sped-${safeCompany}.xlsx`);
  };

  return <div className="space-y-5">
    <section className="rounded-xl border border-border bg-background p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Relacionamento SPED</h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">Plano de Contas + Centro de Custo → conta mais próxima do Plano Referencial da Receita. Só isso.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => void generateBridge()} disabled={mapping || !accounts.length || !referentialAccounts.length}>
            {mapping ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            {mapping ? "Relacionando..." : relationships.length ? "Refazer relacionamento" : "Gerar relacionamento"}
          </Button>
          <Button type="button" variant="outline" onClick={exportFile} disabled={!relationships.length}><Download className="mr-2 h-4 w-4" />Gerar arquivo</Button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
        <span><strong className="text-foreground">{targetAccounts.length}</strong> contas para referenciar</span>
        <span><strong className="text-foreground">{mappedCount}</strong> relacionadas</span>
        <span><strong className="text-foreground">{pendingCount}</strong> pendentes</span>
        <span><strong className="text-foreground">{referentialAccounts.length}</strong> contas na base referencial</span>
      </div>

      {!referentialAccounts.length && <div className="mt-4 flex flex-col gap-3 rounded-lg border border-amber-500/30 bg-amber-500/[0.06] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-sm font-medium">Plano Referencial da Receita não carregado</p><p className="mt-1 text-xs text-muted-foreground">Carregue a base uma vez para liberar o relacionamento.</p></div>
        <Button type="button" variant="outline" onClick={() => referenceInputRef.current?.click()}><Upload className="mr-2 h-4 w-4" />Carregar plano referencial</Button>
      </div>}
      <input ref={referenceInputRef} type="file" multiple accept=".xlsx,.xls,.csv" className="sr-only" onChange={event => void importReferenceBase(event)} />

      {summary && <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/[0.06] px-4 py-3 text-sm"><CheckCircle2 className="mr-2 inline h-4 w-4 text-emerald-600" />{summary}</div>}
      {error && <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div>}
    </section>

    <section className="rounded-xl border border-border bg-background">
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h3 className="text-sm font-semibold">Plano da empresa → Receita Federal</h3><p className="mt-1 text-xs text-muted-foreground">O centro de custo vem da aba anterior. Se uma referência não ficar boa, troque diretamente na linha.</p></div>
        <Input className="max-w-sm" value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar conta, C.R. ou descrição" />
      </div>

      <div className="max-h-[680px] overflow-auto">
        <table className="w-full min-w-[1100px] text-sm">
          <thead className="sticky top-0 z-10 bg-muted/95 text-left text-xs text-muted-foreground"><tr><th className="border-b border-r border-border px-3 py-2">Conta</th><th className="border-b border-r border-border px-3 py-2">C.R.</th><th className="border-b border-r border-border px-3 py-2">Descrição</th><th className="border-b border-r border-border px-3 py-2">Centro de custo</th><th className="border-b border-r border-border px-3 py-2">Referência Receita</th><th className="border-b border-border px-3 py-2">Status</th></tr></thead>
          <tbody>{filteredAccounts.map(account => {
            const relation = relationshipMap.get(account.reducedCode) as GeneratedSpedRelationship | undefined;
            const centerCode = relation?.costCenterReducedCode || ruleMap.get(account.reducedCode)?.costCenterReducedCode || "";
            const center = centerCode ? centerMap.get(centerCode) : null;
            const candidates = candidatesForSpedAccount(account, referentialAccounts, 20);
            const selectedReference = relation?.referentialCode || "";
            return <tr key={account.id} className="border-b border-border last:border-0">
              <td className="border-r border-border px-3 py-2 font-mono text-xs">{account.account}</td>
              <td className="border-r border-border px-3 py-2 tabular-nums">{account.reducedCode}</td>
              <td className="border-r border-border px-3 py-2"><div>{account.description}</div><div className="mt-0.5 text-[10px] text-muted-foreground">{groupLabel(groupFromAccountCode(account.account))}</div></td>
              <td className="border-r border-border px-3 py-2">{centerCode ? <><span className="font-medium">{centerCode}</span><span className="ml-2 text-xs text-muted-foreground">{center?.description}</span></> : <span className="text-muted-foreground">—</span>}</td>
              <td className="border-r border-border px-3 py-2"><select className="h-9 w-full min-w-[340px] rounded-md border border-input bg-background px-2 text-sm" value={selectedReference} onChange={event => void updateReference(account, event.target.value)}><option value="">Sem referência</option>{candidates.map(candidate => <option key={candidate.code} value={candidate.code}>{candidate.code} · {candidate.description}</option>)}</select></td>
              <td className="px-3 py-2 text-xs">{relation ? relation.source === "manual" ? <span className="font-medium text-cyan-700 dark:text-cyan-300">Revisado</span> : <span className="font-medium text-emerald-700 dark:text-emerald-300">Automático</span> : <span className="text-muted-foreground">Pendente</span>}</td>
            </tr>;
          })}{!filteredAccounts.length && <tr><td colSpan={6} className="h-40 text-center text-muted-foreground">Nenhuma conta analítica disponível para relacionamento.</td></tr>}</tbody>
        </table>
      </div>
    </section>
  </div>;
}
