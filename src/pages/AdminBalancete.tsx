import { AdminLayout } from "@/components/admin/layout/AdminLayout";
import { BalanceteWorkspaceShell } from "@/components/admin/lancamentos/BalanceteWorkspaceShell";

export default function AdminBalancete() {
  return <AdminLayout><div className="lancamentos-clean"><BalanceteWorkspaceShell /></div></AdminLayout>;
}
