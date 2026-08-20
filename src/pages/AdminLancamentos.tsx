import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { LancamentosWorkspace } from '@/components/admin/lancamentos/LancamentosWorkspace';

const AdminLancamentos = () => {
  return (
    <AdminLayout>
      <LancamentosWorkspace />
    </AdminLayout>
  );
};

export default AdminLancamentos;
