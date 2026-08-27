import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { LancamentosWorkspace } from '@/components/admin/lancamentos/LancamentosWorkspace';

const AdminLancamentos = () => {
  return (
    <AdminLayout>
      <div className="lancamentos-clean">
        <LancamentosWorkspace />
      </div>
    </AdminLayout>
  );
};

export default AdminLancamentos;
