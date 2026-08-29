import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Eye, EyeOff, Instagram, MessageCircle, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useSimpleCarousel } from './hooks/useSimpleCarousel';

type CompanyOption = { id: string; company_name: string; trade_name: string | null; cnpj: string; logo_url?: string | null };

const SimpleCarouselManager = () => {
  const { toast } = useToast();
  const { items, loading, uploading, addItem, deleteItem, toggleStatus } = useSimpleCarousel();
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(true);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [instagram, setInstagram] = useState('');
  const [whatsapp, setWhatsapp] = useState('');

  useEffect(() => {
    void supabase.from('companies').select('id,company_name,trade_name,cnpj,logo_url').order('company_name').then(({ data, error }) => {
      if (error) toast({ title: 'Erro', description: 'Não foi possível carregar as empresas cadastradas.', variant: 'destructive' });
      else setCompanies((data || []) as unknown as CompanyOption[]);
      setCompaniesLoading(false);
    });
  }, [toast]);

  const selectedCompany = useMemo(() => companies.find(company => company.id === selectedCompanyId) || null, [companies, selectedCompanyId]);
  const availableCompanies = useMemo(() => {
    const linkedIds = new Set(items.map(item => item.company_id).filter(Boolean));
    return companies.filter(company => !linkedIds.has(company.id));
  }, [companies, items]);

  const handleAddItem = async () => {
    if (!selectedCompany) return;
    if (!selectedCompany.logo_url) {
      toast({ title: 'Logo necessária', description: 'Abra o cadastro da empresa e adicione a logo oficial antes de publicar no carrossel.', variant: 'destructive' });
      return;
    }
    const success = await addItem({ company_id: selectedCompany.id, name: selectedCompany.trade_name || selectedCompany.company_name, logo_url: selectedCompany.logo_url, instagram, whatsapp });
    if (success) { setSelectedCompanyId(''); setInstagram(''); setWhatsapp(''); }
  };

  const formatUrl = (url: string, type: 'instagram' | 'whatsapp') => {
    if (!url) return '';
    if (type === 'instagram') return url.startsWith('http') ? url : `https://instagram.com/${url.replace(/^@/, '')}`;
    return url.startsWith('http') ? url : `https://wa.me/${url.replace(/\D/g, '')}`;
  };

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6 px-5 py-6 lg:px-8">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" />Publicar empresa no carrossel</CardTitle></CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-[220px_minmax(0,1fr)]">
          <div className="flex min-h-44 items-center justify-center rounded-xl border border-border/60 bg-muted/15 p-5">
            {selectedCompany?.logo_url ? <img src={selectedCompany.logo_url} alt="Logo" className="max-h-32 max-w-full object-contain" /> : <div className="text-center text-sm text-muted-foreground"><Building2 className="mx-auto mb-2 h-8 w-8" />A logo vem do cadastro da empresa.</div>}
          </div>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Empresa</Label><select value={selectedCompanyId} onChange={event => setSelectedCompanyId(event.target.value)} disabled={companiesLoading} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Selecione uma empresa</option>{availableCompanies.map(company => <option key={company.id} value={company.id}>{company.trade_name || company.company_name}</option>)}</select></div>
            <div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor="instagram">Instagram</Label><Input id="instagram" value={instagram} onChange={event => setInstagram(event.target.value)} /></div><div><Label htmlFor="whatsapp">WhatsApp</Label><Input id="whatsapp" value={whatsapp} onChange={event => setWhatsapp(event.target.value)} /></div></div>
            <p className="text-xs text-muted-foreground">Nome e logo são sempre herdados do cadastro central. Para trocar a imagem, altere a logo na ficha da empresa.</p>
            <Button onClick={() => void handleAddItem()} disabled={uploading || !selectedCompanyId || !selectedCompany?.logo_url}>{uploading ? 'Publicando...' : 'Publicar no carrossel'}</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Empresas publicadas ({items.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? <div className="py-8 text-center text-sm text-muted-foreground">Carregando...</div> : items.length === 0 ? <div className="py-8 text-center text-muted-foreground">Nenhuma empresa publicada.</div> : <div className="divide-y divide-border/50">{items.map(item => <div key={item.id} className="flex items-center gap-4 py-4"><img src={item.logo_url} alt={item.name} className="h-14 w-14 rounded-lg border bg-white object-contain" /><div className="min-w-0 flex-1"><h3 className="truncate font-medium">{item.name}</h3><div className="mt-1 flex gap-4">{item.instagram && <a href={formatUrl(item.instagram, 'instagram')} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-muted-foreground"><Instagram className="h-3.5 w-3.5" />Instagram</a>}{item.whatsapp && <a href={formatUrl(item.whatsapp, 'whatsapp')} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-muted-foreground"><MessageCircle className="h-3.5 w-3.5" />WhatsApp</a>}</div></div><Button variant="ghost" size="icon" onClick={() => void toggleStatus(item.id, item.status)}>{item.status === 'active' ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</Button><Button variant="ghost" size="icon" className="text-destructive" onClick={() => { if (window.confirm('Remover esta empresa do carrossel?')) void deleteItem(item.id); }}><Trash2 className="h-4 w-4" /></Button></div>)}</div>}
        </CardContent>
      </Card>
    </div>
  );
};

export default SimpleCarouselManager;
