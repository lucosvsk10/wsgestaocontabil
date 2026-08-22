import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, CircleHelp, FileSpreadsheet, Link2, Settings2, ShieldCheck, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChartAccount } from "@/lib/lancamentos/chartOfAccounts";
import { AccountCostCenterRule, CostCenter } from "@/lib/lancamentos/costCenters";
import {
  readSpedRelationships,
  relationshipKey,
  SpedImportResult,
  SpedReferentialAccount,
  SpedRelationship,
  validateSpedRelationships,
} from "@/lib/lancamentos/spedRelationships";
import { loadWorkspaceData, saveWorkspaceData } from "@/lib/lancamentos/workspaceStorage";
import { cn } from "@/lib/utils";

export function SpedRelationshipWorkspace({ company }: { company: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [accounts, setAccounts] = useState<ChartAccount[]>([]);
  const [centers, setCenters] = useState<CostCenter[]>([]);
  const [costCenterRules, setCostCenterRules] = useState<AccountCostCenterRule[]>([]);
  const [relationships, setRelationships] = useState<SpedRelationship[]>([]);
  const [referentialAccounts, setReferentialAccounts] = useState<SpedReferentialAccount[]>([]);
  const [preview, setPreview] = useState<SpedImportResult | null>(null);
  const [query, setQuery] = useState("");
  const [onlySped, setOnlySped] = useState(true);
  const [error, setError] = useState("");
  const [manual, setManual] = useState({ accountReducedCode: "", costCenterReducedCode: "", referentialCode: "" });

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

  const validation = useMemo(
    () => validateSpedRelationships(accounts, centers, costCenterRules, relationships, referentialAccounts),
    [accounts, centers, costCenterRules, relationships, referentialAccounts],
  );

  const impacted = useMemo(() => {
    const map = new Map<string, { critical: boolean; messages: string[] }>();
    validation.groups.forEach(group => {
      group.impactedReducedCodes.forEach(code => {
        const current = map.get(code) ?? { critical: false, messages: [] };
        current.critical ||= group.severity === "critical";
        current.messages.push(group.title);
        map.set(code, current);
      });
    });
    return map;
  }, [validation]);

  const filteredAccounts = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("pt-BR");
    return accounts
      .filter(account => account.analytical)
      .filter(account => !onlySped || account.sped)
      .filter(account => !term || `${account.account} ${account.reducedCode} ${account.description}`.toLocaleLowerCase("pt-BR").includes(term))
      .slice(0, 250);
  }, [accounts, onlySped, query]);

  const centerMap = useMemo(() => new Map(centers.map(center => [center.reducedCode, center])), [centers]);
  const referentialMap = useMemo(() => new Map(referentialAccounts.map(account => [account.code, account])), [referentialAccounts]);
  const criticalGroups = validation.groups.filter(group => group.severity === "critical");
  const warningGroups = validation.groups.filter(group => group.severity === "warning");
  const hasImportedData = relationships.length > 0;

  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    try {
      setPreview(await readSpedRelationships(file));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível ler o arquivo exportado do Calima.");
    }
  };

  const confirmImport = async () => {
    if (!preview) return;
    const nextRelationships = preview.relationships;
    const nextReferential = Array.from(new Map(preview.referentialAccounts.map(account => [account.code, account])).values());
    setRelationships(nextRelationships);
    setReferentialAccounts(nextReferential);
    await Promise.all([
      saveWorkspaceData(relationshipsKey, nextRelationships),
      saveWorkspaceData(referentialKey, nextReferential),
    ]);
    setPreview(null);
  };

  const addManual = async () => {
    if (!manual.accountReducedCode || !manual.referentialCode) return;
    const nextRelation: SpedRelationship = {
      id: `manual-${crypto.randomUUID()}`,
      accountReducedCode: manual.accountReducedCode,
      costCenterReducedCode: manual.costCenterReducedCode,
      referentialCode: manual.referentialCode.trim(),
      source: "manual",
    };
    const key = relationshipKey(nextRelation.accountReducedCode, nextRelation.costCenterReducedCode);
    const next = [
      ...relationships.filter(item => relationshipKey(item.accountReducedCode, item.costCenterReducedCode) !== key),
      nextRelation,
    ];
    setRelationships(next);
    await saveWorkspaceData(relationshipsKey, next);
    setManual({ accountReducedCode: "", costCenterReducedCode: "", referentialCode: "" });
  };

  const removeRelationship = async (id: string) => {
    const next = relationships.filter(item => item.id !== id);
    setRelationships(next);
    await saveWorkspaceData(relationshipsKey, next);
  };

  return <div className="space-y-6">
    <section className="overflow-hidden rounded-xl border border-border bg-background">
      <div className="border-b border-border bg-muted/20 p-5 sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-cyan-600" /><h2 className="text-lg font-semibold">Conferência antes do SPED</h2></div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Esta área serve para evitar aquele problema de <strong className="font-medium text-foreground">um erro gerar dezenas de críticas</strong>. Você importa o relacionamento do Calima e o site procura a causa do problema antes de enviar para a Receita.</p>
          </div>
          <Button size="lg" onClick={() => inputRef.current?.click()}><Upload className="mr-2 h-4 w-4" />Importar arquivo do Calima</Button>
          <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="sr-only" onChange={event => void importFile(event)} />
        </div>
      </div>

      <div className="grid gap-px bg-border md:grid-cols-3">
        <Step number="1" title="Importe" text="Exporte o relacionamento no Calima e envie o arquivo aqui." />
        <Step number="2" title="O site confere" text="Nós cruzamos contas, centros de custo e os vínculos usados pelo SPED." />
        <Step number="3" title="Corrija a causa" text="Você vê o problema principal, sem receber uma lista enorme de erros repetidos." />
      </div>
    </section>

    {error && <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div>}

    {preview && <section className="rounded-xl border border-cyan-500/30 bg-cyan-500/[0.04] p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-cyan-700 dark:text-cyan-300">Arquivo reconhecido</p>
          <h3 className="mt-1 font-semibold">Pronto para analisar</h3>
          <p className="mt-1 text-sm text-muted-foreground">Encontramos {preview.relationships.length} vínculo(s) entre contas. Clique em analisar para substituir os dados anteriores desta empresa.</p>
          {preview.warnings.map(warning => <p key={warning} className="mt-2 text-xs text-amber-700 dark:text-amber-300">{warning}</p>)}
        </div>
        <div className="flex gap-2"><Button variant="outline" onClick={() => setPreview(null)}>Cancelar</Button><Button onClick={() => void confirmImport()}>Importar e analisar</Button></div>
      </div>
    </section>}

    {!hasImportedData ? <EmptyState onImport={() => inputRef.current?.click()} /> : <>
      {validation.criticalGroups > 0 ? <section className="rounded-xl border-2 border-red-500/50 bg-red-500/[0.07] p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-red-500/15 text-red-600"><AlertTriangle className="h-6 w-6" /></div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-red-700 dark:text-red-300">Precisa de correção</p>
            <h3 className="mt-1 text-xl font-semibold text-foreground">Encontramos {validation.criticalGroups} problema(s) importante(s)</h3>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Não significa que existem {validation.impactedAccounts} erros diferentes. Um único relacionamento errado pode afetar várias contas. Abaixo mostramos as causas principais.</p>
          </div>
        </div>
      </section> : <section className="rounded-xl border-2 border-emerald-500/40 bg-emerald-500/[0.06] p-5 sm:p-6">
        <div className="flex items-start gap-4"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-emerald-500/15 text-emerald-600"><CheckCircle2 className="h-6 w-6" /></div><div><p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Estrutura conferida</p><h3 className="mt-1 text-xl font-semibold">Nenhum problema impeditivo encontrado</h3><p className="mt-2 text-sm text-muted-foreground">Os vínculos disponíveis estão estruturalmente coerentes. {warningGroups.length ? `Ainda existem ${warningGroups.length} aviso(s) não impeditivo(s) para revisar.` : "Não há avisos pendentes."}</p></div></div>
      </section>}

      {criticalGroups.length > 0 && <section className="rounded-xl border border-border bg-background">
        <div className="border-b border-border p-5"><h3 className="font-semibold">O que precisa ser corrigido</h3><p className="mt-1 text-sm text-muted-foreground">Comece pelo primeiro item. Corrigir uma causa pode eliminar várias críticas de uma vez.</p></div>
        <div className="divide-y divide-border">{criticalGroups.map((group, index) => <ProblemCard key={group.id} index={index + 1} title={plainTitle(group.code, group.title)} explanation={plainExplanation(group.code, group.message)} impactedCount={group.impactedCount} codes={group.impactedReducedCodes} />)}</div>
      </section>}

      {warningGroups.length > 0 && <details className="rounded-xl border border-border bg-background">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5"><div><h3 className="text-sm font-semibold">Avisos que não bloqueiam o processo</h3><p className="mt-1 text-xs text-muted-foreground">{warningGroups.length} aviso(s) para revisar depois dos problemas importantes.</p></div><ChevronDown className="h-4 w-4 text-muted-foreground" /></summary>
        <div className="border-t border-border p-5 space-y-3">{warningGroups.map(group => <div key={group.id} className="rounded-lg bg-amber-500/[0.06] p-4"><p className="text-sm font-medium">{plainTitle(group.code, group.title)}</p><p className="mt-1 text-xs text-muted-foreground">{plainExplanation(group.code, group.message)}</p></div>)}</div>
      </details>}
    </>}

    <details className="rounded-xl border border-border bg-background">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5">
        <div className="flex items-center gap-3"><Settings2 className="h-5 w-5 text-muted-foreground" /><div><h3 className="font-semibold">Configurações avançadas</h3><p className="mt-1 text-xs text-muted-foreground">Códigos, vínculos manuais e tabela técnica. Normalmente você não precisa mexer aqui.</p></div></div>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </summary>

      <div className="space-y-6 border-t border-border p-5">
        <div className="rounded-lg border border-border bg-muted/20 p-4">
          <div className="flex gap-3"><CircleHelp className="mt-0.5 h-4 w-4 shrink-0 text-cyan-600" /><div><p className="text-sm font-medium">O que é “conta referencial”?</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">É o código usado para dizer ao SPED a qual categoria oficial da Receita uma conta da empresa corresponde. Você não precisa decorar isso: o objetivo desta tela é conferir se os vínculos importados do Calima fazem sentido.</p></div></div>
        </div>

        <section>
          <div><h4 className="text-sm font-semibold">Corrigir um vínculo manualmente</h4><p className="mt-1 text-xs text-muted-foreground">Use somente quando souber exatamente qual vínculo precisa substituir.</p></div>
          <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(260px,1.4fr)_minmax(200px,1fr)_minmax(220px,1fr)_auto]">
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={manual.accountReducedCode} onChange={event => setManual(value => ({ ...value, accountReducedCode: event.target.value }))}><option value="">Escolha a conta...</option>{accounts.filter(account => account.analytical).map(account => <option key={account.id} value={account.reducedCode}>{account.reducedCode} · {account.description}</option>)}</select>
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={manual.costCenterReducedCode} onChange={event => setManual(value => ({ ...value, costCenterReducedCode: event.target.value }))}><option value="">Sem centro de custo</option>{centers.map(center => <option key={center.id} value={center.reducedCode}>{center.reducedCode} · {center.description}</option>)}</select>
            <Input list="sped-reference-list" placeholder="Código referencial" value={manual.referentialCode} onChange={event => setManual(value => ({ ...value, referentialCode: event.target.value }))} />
            <Button disabled={!manual.accountReducedCode || !manual.referentialCode.trim()} onClick={() => void addManual()}><Link2 className="mr-2 h-4 w-4" />Salvar vínculo</Button>
            <datalist id="sped-reference-list">{referentialAccounts.map(account => <option key={account.code} value={account.code}>{account.description}</option>)}</datalist>
          </div>
        </section>

        <section className="overflow-hidden rounded-lg border border-border">
          <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
            <div><h4 className="text-sm font-semibold">Tabela técnica de relacionamentos</h4><p className="mt-1 text-xs text-muted-foreground">Conta da empresa → centro de custo → código referencial usado no SPED.</p></div>
            <div className="flex flex-wrap gap-2"><Button size="sm" variant={onlySped ? "default" : "outline"} onClick={() => setOnlySped(value => !value)}>{onlySped ? "Somente contas SPED" : "Todas as contas"}</Button><Input className="w-72" placeholder="Buscar conta ou descrição" value={query} onChange={event => setQuery(event.target.value)} /></div>
          </div>
          <div className="max-h-[620px] overflow-auto"><table className="w-full min-w-[1050px] text-xs"><thead className="sticky top-0 z-10 bg-muted/95 text-left text-[11px] text-muted-foreground"><tr><th className="border-b border-r border-border px-3 py-2">Conta</th><th className="border-b border-r border-border px-3 py-2">C.R.</th><th className="border-b border-r border-border px-3 py-2">Descrição</th><th className="border-b border-r border-border px-3 py-2">Centro de custo</th><th className="border-b border-r border-border px-3 py-2">Código referencial</th><th className="border-b border-border px-3 py-2">Status</th></tr></thead><tbody>{filteredAccounts.map(account => {
            const relation = relationships.find(item => item.accountReducedCode === account.reducedCode);
            const status = impacted.get(account.reducedCode);
            const center = relation?.costCenterReducedCode ? centerMap.get(relation.costCenterReducedCode) : null;
            const reference = relation ? referentialMap.get(relation.referentialCode) : null;
            return <tr key={account.id} className={cn("border-b border-border last:border-0", status?.critical ? "bg-red-500/[0.12]" : status ? "bg-amber-500/[0.07]" : relation ? "bg-emerald-500/[0.07]" : "")}><td className="border-r border-border px-3 py-2 font-mono">{account.account}</td><td className="border-r border-border px-3 py-2 tabular-nums">{account.reducedCode}</td><td className="border-r border-border px-3 py-2">{account.description}</td><td className="border-r border-border px-3 py-2">{center ? `${center.reducedCode} · ${center.description}` : relation?.costCenterReducedCode || "—"}</td><td className="border-r border-border px-3 py-2">{relation ? <div><span className="font-mono">{relation.referentialCode}</span>{reference?.description && <p className="mt-0.5 max-w-[280px] truncate text-[10px] text-muted-foreground">{reference.description}</p>}</div> : "—"}</td><td className="px-3 py-2">{status?.critical ? <span className="font-medium text-red-700 dark:text-red-300">Corrigir</span> : status ? <span className="font-medium text-amber-700 dark:text-amber-300">Revisar</span> : relation ? <span className="font-medium text-emerald-700 dark:text-emerald-300">OK</span> : <span className="text-muted-foreground">Sem vínculo</span>}</td></tr>;
          })}{!filteredAccounts.length && <tr><td colSpan={6} className="h-36 text-center text-muted-foreground">Nenhuma conta encontrada.</td></tr>}</tbody></table></div>
        </section>

        {relationships.length > 0 && <section>
          <h4 className="text-sm font-semibold">Vínculos importados</h4><div className="mt-3 space-y-2">{relationships.slice(0, 150).map(item => <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-xs"><div className="min-w-0"><span className="font-medium">C.R. {item.accountReducedCode}</span><span className="mx-2 text-muted-foreground">→</span><span>{item.costCenterReducedCode ? `C.C. ${item.costCenterReducedCode} → ` : ""}{item.referentialCode}</span></div><Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => void removeRelationship(item.id)}><Trash2 className="h-3.5 w-3.5" /></Button></div>)}</div>
        </section>}
      </div>
    </details>
  </div>;
}

function Step({ number, title, text }: { number: string; title: string; text: string }) {
  return <div className="bg-background p-5"><div className="flex items-start gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-cyan-500/15 text-xs font-bold text-cyan-700 dark:text-cyan-300">{number}</span><div><p className="text-sm font-semibold">{title}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{text}</p></div></div></div>;
}

function EmptyState({ onImport }: { onImport: () => void }) {
  return <section className="grid min-h-[280px] place-items-center rounded-xl border border-dashed border-border bg-muted/10 p-8 text-center"><div className="max-w-lg"><FileSpreadsheet className="mx-auto h-9 w-9 text-muted-foreground" /><h3 className="mt-4 text-lg font-semibold">Comece pelo arquivo do Calima</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Você não precisa preencher nenhuma tabela agora. Exporte o arquivo de relacionamento do Calima, importe aqui e deixe o site apontar o que precisa ser corrigido.</p><Button className="mt-5" onClick={onImport}><Upload className="mr-2 h-4 w-4" />Selecionar arquivo</Button></div></section>;
}

function ProblemCard({ index, title, explanation, impactedCount, codes }: { index: number; title: string; explanation: string; impactedCount: number; codes: string[] }) {
  return <div className="p-5"><div className="flex items-start gap-4"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-red-500/15 text-sm font-bold text-red-700 dark:text-red-300">{index}</span><div className="min-w-0 flex-1"><div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><p className="font-semibold">{title}</p><p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-muted-foreground">{explanation}</p></div><span className="shrink-0 rounded-full bg-red-500/10 px-2.5 py-1 text-[11px] font-semibold text-red-700 dark:text-red-300">Afeta {impactedCount} conta(s)</span></div><details className="mt-3"><summary className="cursor-pointer text-xs font-medium text-cyan-700 dark:text-cyan-300">Ver contas afetadas</summary><div className="mt-2 flex flex-wrap gap-1.5">{codes.slice(0, 80).map(code => <span key={code} className="rounded border border-border bg-muted/50 px-2 py-1 text-[10px]">C.R. {code}</span>)}</div></details></div></div></div>;
}

function plainTitle(code: string, fallback: string) {
  const titles: Record<string, string> = {
    ACCOUNT_NOT_FOUND: "Há vínculos apontando para contas que não existem",
    PARENT_MISSING: "A hierarquia do plano de contas está quebrada",
    COST_CENTER_NOT_FOUND: "Há centro de custo usado que não existe no cadastro",
    I051_DUPLICATE: "A mesma conta está ligada a dois destinos diferentes",
    REFERENCE_NOT_FOUND: "Alguns códigos de referência ainda não puderam ser conferidos",
    NATURE_MISMATCH: "Uma conta foi ligada a uma categoria incompatível",
    REQUIRED_CENTER_RELATION_MISSING: "Falta o vínculo de uma conta que exige centro de custo",
    SPED_ACCOUNT_UNMAPPED: "Há contas do SPED ainda sem vínculo",
  };
  return titles[code] ?? fallback;
}

function plainExplanation(code: string, fallback: string) {
  const explanations: Record<string, string> = {
    ACCOUNT_NOT_FOUND: "O arquivo importado cita uma conta que não está no Plano de Contas desta empresa. Isso costuma acontecer quando o cadastro do Calima e o cadastro do site não estão iguais.",
    PARENT_MISSING: "Uma conta filha não encontrou a conta superior que deveria organizar o grupo. Esse é exatamente o tipo de erro que pode gerar muitas críticas em sequência.",
    COST_CENTER_NOT_FOUND: "O relacionamento usa um centro de custo que não existe na aba Centros de Custo. Primeiro corrija ou importe esse cadastro.",
    I051_DUPLICATE: "A mesma combinação de conta e centro de custo está apontando para mais de um código da Receita. É preciso deixar apenas um destino correto.",
    REFERENCE_NOT_FOUND: "O vínculo existe, mas ainda não temos informação suficiente sobre o código oficial usado do outro lado. Não é necessariamente um erro, mas precisa ser conferido.",
    NATURE_MISMATCH: "Uma conta de ativo, passivo, receita ou despesa foi ligada a uma categoria de natureza diferente. Esse vínculo precisa ser corrigido.",
    REQUIRED_CENTER_RELATION_MISSING: "A conta foi configurada para usar centro de custo, mas ainda não existe um vínculo completo para ela no relacionamento do SPED.",
    SPED_ACCOUNT_UNMAPPED: "A conta está marcada para participar do SPED, mas ainda não tem um código de referência relacionado.",
  };
  return explanations[code] ?? fallback;
}
