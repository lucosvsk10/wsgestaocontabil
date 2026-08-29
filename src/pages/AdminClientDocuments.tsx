import { useEffect } from 'react';
import { FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { AdminEmptyState, AdminPage, AdminPageHeader, AdminSection } from '@/components/admin/ui/AdminPage';
import { useCompanySelection } from '@/contexts/CompanySelectionContext';

export default function AdminClientDocuments() {
  const navigate = useNavigate();
  const { selectedCompany, loading } = useCompanySelection();

  useEffect(() => {
    if (!loading && selectedCompany?.portal_user_id) navigate(`/admin/user-documents/${selectedCompany.portal_user_id}`, { replace: true });
  }, [loading, navigate, selectedCompany?.portal_user_id]);

  return (
    <AdminLayout>
      <AdminPage>
        <AdminPageHeader eyebrow="Clientes do escritório" title="Documentos do cliente" description="Os documentos acompanham a empresa selecionada no topo do Admin." />
        <AdminSection className="mt-6">
          {loading ? <div className="py-14 text-center text-sm text-muted-foreground">Carregando empresa...</div> : !selectedCompany ? (
            <AdminEmptyState icon={<FileText className="h-8 w-8" />} title="Selecione uma empresa" description="Use o seletor no topo para abrir os documentos do cliente." />
          ) : !selectedCompany.portal_user_id ? (
            <AdminEmptyState icon={<FileText className="h-8 w-8" />} title="Sem acesso do portal vinculado" description={`${selectedCompany.trade_name || selectedCompany.company_name} ainda não possui uma credencial de portal ligada ao cadastro central.`} />
          ) : (
            <div className="py-14 text-center text-sm text-muted-foreground">Abrindo documentos...</div>
          )}
        </AdminSection>
      </AdminPage>
    </AdminLayout>
  );
}
