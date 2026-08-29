import { Building2, ChevronDown, Settings2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCompanySelection } from '@/contexts/CompanySelectionContext';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const formatCnpj = (value?: string) => {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length === 14 ? digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') : value || 'Sem CNPJ';
};

export function AdminCompanySelector() {
  const navigate = useNavigate();
  const { companies, selectedCompany, selectCompany, loading } = useCompanySelection();

  return (
    <div className="flex min-w-0 items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-10 min-w-[260px] max-w-[430px] justify-between gap-3 rounded-lg border border-border/60 bg-card px-3 shadow-none hover:bg-muted/35">
            <span className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted/55">
                {selectedCompany?.logo_url ? <img src={selectedCompany.logo_url} alt="" className="h-full w-full object-contain" /> : <Building2 className="h-3.5 w-3.5 text-muted-foreground" />}
              </span>
              <span className="min-w-0 text-left">
                <span className="block truncate text-xs font-semibold leading-4">{loading ? 'Carregando empresa...' : selectedCompany ? (selectedCompany.trade_name || selectedCompany.company_name) : 'Selecione uma empresa'}</span>
                {selectedCompany && <span className="block truncate text-[10px] leading-3 text-muted-foreground">{formatCnpj(selectedCompany.cnpj)}</span>}
              </span>
            </span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[360px] max-w-[calc(100vw-2rem)]">
          <DropdownMenuLabel className="text-xs text-muted-foreground">Empresa ativa no admin</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <div className="max-h-[340px] overflow-y-auto">
            {companies.map(company => (
              <DropdownMenuItem key={company.id} onSelect={() => selectCompany(company.id)} className="gap-3 py-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted/50">
                  {company.logo_url ? <img src={company.logo_url} alt="" className="h-full w-full object-contain" /> : <Building2 className="h-4 w-4 text-muted-foreground" />}
                </span>
                <span className="min-w-0"><span className="block truncate text-sm font-medium">{company.trade_name || company.company_name}</span><span className="block truncate text-xs text-muted-foreground">{formatCnpj(company.cnpj)}</span></span>
              </DropdownMenuItem>
            ))}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        variant="ghost"
        size="icon"
        className="h-10 w-10 shrink-0 rounded-lg border border-border/60"
        disabled={!selectedCompany}
        onClick={() => selectedCompany && navigate(`/admin/clientes/${selectedCompany.id}`)}
        aria-label="Abrir cadastro completo da empresa"
        title="Cadastro da empresa"
      >
        <Settings2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
