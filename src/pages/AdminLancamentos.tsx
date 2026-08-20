import { AdminLayout } from '@/components/admin/layout/AdminLayout';

const AdminLancamentos = () => {
  return (
    <AdminLayout>
      <div className="mx-auto w-full max-w-[1560px] px-4 pb-12 pt-6 sm:px-6 lg:px-8 lg:pt-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Operação contábil
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Lançamentos
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Área limpa para a construção do novo sistema de lançamentos.
        </p>
      </div>
    </AdminLayout>
  );
};

export default AdminLancamentos;
