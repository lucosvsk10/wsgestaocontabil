import ThemeToggle from "@/components/ThemeToggle";
import AccountDrawer from "@/components/account/AccountDrawer";
import { ChevronRight, ShieldCheck } from "lucide-react";

const ClientHeader = () => {
  return (
    <header className="client-portal-header">
      <div className="client-portal-breadcrumb" aria-label="Localização atual">
        <span>Portal do cliente</span>
        <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" />
        <strong>Documentos</strong>
      </div>
      <div className="client-portal-header-actions">
        <span className="client-portal-secure"><ShieldCheck aria-hidden="true" className="h-3.5 w-3.5" />Acesso protegido</span>
        <ThemeToggle />
        <AccountDrawer accessLabel="Cliente do escritório" planLabel="Portal do cliente" usageRows={[{label:"Área",value:"Portal contábil"}]} />
      </div>
    </header>
  );
};

export default ClientHeader;
