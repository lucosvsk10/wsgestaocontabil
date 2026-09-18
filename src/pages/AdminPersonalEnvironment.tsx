import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { AdminPage } from '@/components/admin/ui/AdminPage';

export default function AdminPersonalEnvironment() {
  return (
    <AdminLayout>
      <AdminPage>
        <div className="mx-auto max-w-5xl px-2 py-8 sm:px-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Ambiente Pessoal
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Departamento Pessoal</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            Estrutura criada. As rotinas de Departamento Pessoal e RH serão adicionadas neste ambiente.
          </p>
        </div>
      </AdminPage>
    </AdminLayout>
  );
}
