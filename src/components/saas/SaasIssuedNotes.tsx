import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Props = { emissions: any[]; onNew: () => void };
const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const types = ["Todas", "NF-E", "NFC-E", "NFS-E", "CT-E", "MDF-E"];

export default function SaasIssuedNotes({ emissions, onNew }: Props) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("Todas");
  const [status, setStatus] = useState("Todos");

  const rows = useMemo(() => emissions.filter((item) => {
    const docType = String(item.document_type || "").toUpperCase();
    const matchesType = type === "Todas" || docType === type;
    const matchesStatus = status === "Todos" || String(item.status || "").toLowerCase() === status.toLowerCase();
    const text = [item.number, item.recipient_name, item.access_key, item.document_type].map((x) => String(x || "").toLowerCase()).join(" ");
    const matchesQuery = !query.trim() || text.includes(query.trim().toLowerCase());
    return matchesType && matchesStatus && matchesQuery;
  }), [emissions, query, type, status]);

  return <div className="mx-auto w-full max-w-[1540px] space-y-5 text-[#111827]">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[.15em] text-[#7b8492]">Emissão fiscal</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Notas Emitidas</h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-[#667085]">Consulte todas as notas emitidas pela conta, organizadas por tipo, situação e destinatário.</p>
      </div>
      <Button onClick={onNew}>Emitir nova nota</Button>
    </div>

    <section className="overflow-hidden rounded-2xl border border-[#d8dee6] bg-white shadow-sm">
      <div className="border-b border-[#e1e6ec] p-4">
        <div className="flex flex-wrap items-center gap-2">
          {types.map((item) => <button key={item} type="button" onClick={() => setType(item)} className={`rounded-md px-3 py-2 text-xs font-medium transition ${type === item ? "bg-[#202833] text-white" : "border border-[#d9dfe6] bg-white text-[#667085] hover:bg-[#f6f8fa]"}`}>{item}</button>)}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_220px]">
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por número, destinatário ou chave de acesso..." />
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 rounded-md border border-[#cbd3dc] bg-white px-3 text-sm text-[#111827]">
            <option>Todos</option>
            <option value="authorized">Autorizadas</option>
            <option value="draft">Rascunhos</option>
            <option value="validated">Em processamento</option>
            <option value="rejected">Rejeitadas</option>
            <option value="cancelled">Canceladas</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] text-left">
          <thead>
            <tr className="border-b border-[#e1e6ec] bg-[#f7f9fb] text-[10px] uppercase tracking-[.12em] text-[#7b8492]">
              <th className="px-5 py-3 font-semibold">Documento</th>
              <th className="px-5 py-3 font-semibold">Número</th>
              <th className="px-5 py-3 font-semibold">Destinatário</th>
              <th className="px-5 py-3 font-semibold">Emissão</th>
              <th className="px-5 py-3 font-semibold">Situação</th>
              <th className="px-5 py-3 text-right font-semibold">Valor</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item, index) => <tr key={item.id || index} className="border-b border-[#edf0f3] text-sm last:border-b-0 hover:bg-[#fafbfc]">
              <td className="px-5 py-4 font-semibold">{String(item.document_type || "Documento").toUpperCase()}</td>
              <td className="px-5 py-4 text-[#475467]">{item.number || "—"}</td>
              <td className="max-w-[280px] truncate px-5 py-4 text-[#475467]">{item.recipient_name || "Sem destinatário"}</td>
              <td className="px-5 py-4 text-[#667085]">{item.created_at ? new Date(item.created_at).toLocaleDateString("pt-BR") : "—"}</td>
              <td className="px-5 py-4"><Status value={String(item.status || "draft")} /></td>
              <td className="px-5 py-4 text-right font-medium">{money(Number(item.total || 0))}</td>
            </tr>)}
            {!rows.length && <tr><td colSpan={6} className="px-5 py-16 text-center text-sm text-[#98a2b3]">Nenhuma nota encontrada com os filtros atuais.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  </div>;
}

function Status({ value }: { value: string }) {
  const normalized = value.toLowerCase();
  const labels: Record<string, string> = { authorized: "Autorizada", draft: "Rascunho", validated: "Em processamento", rejected: "Rejeitada", cancelled: "Cancelada" };
  const classes: Record<string, string> = { authorized: "border-emerald-200 bg-emerald-50 text-emerald-700", draft: "border-slate-200 bg-slate-50 text-slate-600", validated: "border-amber-200 bg-amber-50 text-amber-700", rejected: "border-red-200 bg-red-50 text-red-700", cancelled: "border-zinc-200 bg-zinc-50 text-zinc-600" };
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold ${classes[normalized] || classes.draft}`}>{labels[normalized] || value}</span>;
}
