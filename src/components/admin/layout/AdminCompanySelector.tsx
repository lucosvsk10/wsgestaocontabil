import { ChevronDown, Settings2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCompanySelection, OfficeCompanySelection } from '@/contexts/CompanySelectionContext';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const formatCnpj = (value?: string | null) => {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length === 14 ? digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') : value || 'Cadastro pendente';
};
const initial = (name?: string | null) => String(name || '?').trim().charAt(0).toUpperCase() || '?';
const tradeLabel = (company?: OfficeCompanySelection | null) => {
  const trade = String(company?.trade_name || '').trim();
  const legal = String(company?.company_name || '').trim();
  return trade && trade.toLocaleLowerCase('pt-BR') !== legal.toLocaleLowerCase('pt-BR') ? trade : '';
};

function CompanyAvatar({ logo, name, compact = false }: { logo?: string | null; name?: string | null; compact?: boolean }) {
  return <span className={`flex ${compact ? 'h-8 w-8 rounded-lg' : 'h-10 w-10 rounded-xl'} shrink-0 items-center justify-center overflow-hidden border border-border/50 bg-muted/45 text-xs font-semibold text-muted-foreground`}>{logo ? <img src={logo} alt="" className="h-full w-full object-contain" /> : initial(name)}</span>;
}
function CompanyStatusDot({ company }: { company?: OfficeCompanySelection | null }) {
  const status = company?.certificate_status || 'missing';
  const classes = status === 'valid' ? 'bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,.12)]' : status === 'expired' ? 'bg-red-500 shadow-[0_0_0_3px_rgba(239,68,68,.12)]' : 'bg-zinc-400/80';
  const label = status === 'valid' ? 'A1 válido' : status === 'expired' ? 'A1 vencido' : 'Sem A1';
  return <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${classes}`} aria-label={label} title={label} />;
}

export function AdminCompanySelector() {
  const navigate = useNavigate();
  const { companies, selectedCompany, selectCompany, loading, refreshCompanies } = useCompanySelection();
  const legalName = selectedCompany?.company_name || 'Selecione uma empresa';
  const fantasy = tradeLabel(selectedCompany);

  return <div className="flex min-w-0 items-center gap-2">
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-16 min-w-[380px] max-w-[600px] justify-between gap-4 rounded-xl border border-border/60 bg-card px-4 shadow-sm hover:bg-muted/30">
          <span className="flex min-w-0 items-center gap-3"><CompanyAvatar logo={selectedCompany?.logo_url} name={legalName} /><span className="min-w-0 text-left"><span className="block truncate text-sm font-semibold leading-5">{loading ? 'Carregando empresas...' : legalName}</span>{selectedCompany && <>{fantasy && <span className="block truncate text-[11px] font-medium leading-4 text-muted-foreground">{fantasy}</span>}<span className="block truncate text-[10px] leading-4 text-muted-foreground/80">{formatCnpj(selectedCompany.cnpj)}</span></>}</span></span>
          <span className="flex shrink-0 items-center gap-2.5">{selectedCompany && <CompanyStatusDot company={selectedCompany} />}<ChevronDown className="h-4 w-4 text-muted-foreground" /></span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" sideOffset={8} className="z-[240] w-[480px] max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-popover shadow-2xl">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Selecionar empresa para todo o Admin</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-[420px] overflow-y-auto p-1">
          {companies.length ? companies.map(company => {
            const companyFantasy = tradeLabel(company);
            const active = company.id === selectedCompany?.id;
            return <DropdownMenuItem key={company.id} onSelect={() => selectCompany(company.id)} className={`gap-3 rounded-lg py-3 ${active ? 'bg-muted/60' : ''}`}>
              <CompanyAvatar logo={company.logo_url} name={company.company_name} compact />
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{company.company_name}</span>{companyFantasy && <span className="block truncate text-xs text-muted-foreground">{companyFantasy}</span>}<span className="block truncate text-[10px] text-muted-foreground/80">{formatCnpj(company.cnpj)}</span></span>
              <CompanyStatusDot company={company} />
              {active && <span className="text-[10px] font-medium text-muted-foreground">Ativa</span>}
            </DropdownMenuItem>;
          }) : <div className="px-4 py-8 text-center"><p className="text-sm font-medium">Nenhuma empresa carregada</p><p className="mt-1 text-xs text-muted-foreground">Tente recarregar a lista do operador.</p><Button size="sm" variant="outline" className="mt-4" onClick={() => void refreshCompanies()}>Recarregar empresas</Button></div>}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
    <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 rounded-lg" disabled={!selectedCompany} onClick={() => selectedCompany && navigate(`/admin/clientes/${selectedCompany.id}`)} aria-label="Abrir cadastro da empresa" title="Cadastro da empresa"><Settings2 className="h-4 w-4" /></Button>
  </div>;
}
