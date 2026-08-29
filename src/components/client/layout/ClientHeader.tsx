import ThemeToggle from "@/components/ThemeToggle";
import AccountDrawer from "@/components/account/AccountDrawer";

const ClientHeader = () => {
  return (
    <header className="flex items-center justify-between border-b border-gray-100 bg-white px-8 py-6 dark:border-[#020817] dark:bg-[#020817]">
      <div />
      <div className="flex items-center gap-4">
        <ThemeToggle />
        <AccountDrawer accessLabel="Cliente do escritório" planLabel="Portal do cliente" usageRows={[{label:"Área",value:"Portal contábil"}]} />
      </div>
    </header>
  );
};

export default ClientHeader;
