import { useState } from "react";
import { Building2, Check, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { AccountingCompany } from "@/hooks/lancamentos/useAccountingCompany";

const tradeLabel = (company: AccountingCompany) => {
  const trade = String(company.tradeName || "").trim();
  return trade && trade.toLocaleLowerCase("pt-BR") !== String(company.name || "").trim().toLocaleLowerCase("pt-BR") ? trade : "";
};

export function CompanySelector({ company, companies, onSelect }: { company: AccountingCompany; companies: AccountingCompany[]; onSelect: (company: AccountingCompany) => void }) {
  const [open, setOpen] = useState(false); const [query, setQuery] = useState("");
  const filtered = companies.filter(item => `${item.name} ${item.tradeName ?? ""} ${item.cnpj ?? ""}`.toLowerCase().includes(query.toLowerCase()));
  const fantasy = tradeLabel(company);
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button variant="outline" className="h-14 min-w-[340px] justify-start gap-3 border-border bg-background px-3 shadow-none"><span className="grid h-8 w-8 place-items-center rounded bg-muted"><Building2 className="h-4 w-4"/></span><span className="min-w-0 flex-1 text-left"><span className="block truncate text-sm font-medium">{company.name}</span>{fantasy&&<span className="block truncate text-[11px] text-muted-foreground">{fantasy}</span>}</span></Button></DialogTrigger><DialogContent className="max-w-3xl gap-0 overflow-hidden p-0"><DialogHeader className="border-b border-border p-6"><DialogTitle>Selecionar empresa</DialogTitle></DialogHeader><div className="relative m-5"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"/><Input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar por razão social, nome fantasia ou CNPJ" className="pl-9"/></div><div className="max-h-[55vh] overflow-y-auto border-t border-border p-3">{filtered.map(item => {const itemFantasy=tradeLabel(item);return <button key={item.id} type="button" onClick={() => { onSelect(item); setOpen(false); }} className="grid w-full grid-cols-[40px_minmax(0,1fr)_220px_24px] items-center gap-3 rounded-md px-3 py-3 text-left hover:bg-muted"><span className="grid h-9 w-9 place-items-center rounded bg-muted"><Building2 className="h-4 w-4"/></span><span><strong className="block truncate text-sm font-medium">{item.name}</strong>{itemFantasy&&<small className="block truncate text-xs text-muted-foreground">{itemFantasy}</small>}<small className="block text-[10px] text-muted-foreground/80">{item.cnpj || "CNPJ não informado"}</small></span><span className="text-xs text-muted-foreground">{item.chartModel}</span>{company.id === item.id && <Check className="h-4 w-4"/>}</button>})}</div></DialogContent></Dialog>;
}
