import SaasDashboard from '@/components/saas/SaasDashboard';

const recipients = ['Mercado Central Ltda', 'Comercial Palmeira', 'Nordeste Distribuidora', 'Almeida Serviços'];
const documentTypes = ['nfe', 'nfce', 'nfse'];
const products = ['Consultoria mensal', 'Produto fiscal', 'Serviço empresarial'];

const demoEmissions = Array.from({ length: 42 }, (_, index) => ({
  id: `demo-${index}`,
  status: 'authorized',
  document_type: documentTypes[index % documentTypes.length],
  number: String(1840 + index),
  total: 380 + ((index * 173) % 4100),
  recipient_name: recipients[index % recipients.length],
  created_at: new Date(Date.now() - (index % 28) * 86400000).toISOString(),
  payload: { produto: products[index % products.length], quantidade: 1 + (index % 4) },
}));

export default function EmissorPreview() {
  return <main className="min-h-screen bg-[#f3f5f7] p-6 text-[#17233b]"><SaasDashboard organizationId={null} organizationName="Empresa demonstração" emissions={demoEmissions} onNew={() => undefined} onReports={() => undefined} /></main>;
}
