import ThemeToggle from "@/components/ThemeToggle";
import AccountDrawer from "@/components/account/AccountDrawer";

const labels: Record<string, string> = {
  overview: "Início",
  documents: "Documentos",
  calendar: "Obrigações",
  announcements: "Comunicados",
  simulations: "Ferramentas",
  company: "Minha empresa",
};

const ClientHeader = ({ activeTab }: { activeTab: string }) => {
  return (
    <header className="client-portal-header client-portal-header-redesign">
      <div className="client-portal-header-context">
        <span>Portal do cliente</span>
        <strong>{labels[activeTab] || "Portal"}</strong>
      </div>
      <div className="client-portal-header-actions">
        <ThemeToggle />
        <AccountDrawer accessLabel="Cliente do escritório" planLabel="Portal do cliente" usageRows={[{label:"Área",value:"Portal contábil"}]} />
      </div>
    </header>
  );
};

export default ClientHeader;
