import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Eye, EyeOff, Instagram, MessageCircle, Trash2, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useSimpleCarousel } from './hooks/useSimpleCarousel';

type CompanyOption = {
  id: string;
  company_name: string;
  trade_name: string | null;
  cnpj: string;
};

const SimpleCarouselManager = () => {
  const { toast } = useToast();
  const { items, loading, uploading, addItem, updateItem, deleteItem, toggleStatus } = useSimpleCarousel();
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(true);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [instagram, setInstagram] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => {
    const loadCompanies = async () => {
      setCompaniesLoading(true);
      const { data, error } = await supabase
        .from('companies')
        .select('id,company_name,trade_name,cnpj')
        .order('company_name');
      if (error) {
        toast({ title: 'Erro', description: 'Não foi possível carregar as empresas cadastradas.', variant: 'destructive' });
      } else {
        setCompanies((data || []) as CompanyOption[]);
      }
      setCompaniesLoading(false);
    };
    void loadCompanies();
  }, [toast]);

  const selectedCompany = useMemo(
    () => companies.find(company => company.id === selectedCompanyId) || null,
    [companies, selectedCompanyId]
  );

  const availableCompanies = useMemo(() => {
    const linkedIds = new Set(items.map(item => item.company_id).filter(Boolean));
    return companies.filter(company => !linkedIds.has(company.id));
  }, [companies, items]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Erro', description: 'Por favor, selecione uma imagem válida', variant: 'destructive' });
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const resetForm = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedCompanyId('');
    setInstagram('');
    setWhatsapp('');
    setSelectedFile(null);
    setPreviewUrl('');
    const fileInput = document.getElementById('logo-upload') as HTMLInputElement | null;
    if (fileInput) fileInput.value = '';
  };

  const handleAddItem = async () => {
    if (!selectedCompany || !selectedFile) {
      toast({ title: 'Erro', description: 'Selecione uma empresa cadastrada e uma logo.', variant: 'destructive' });
      return;
    }

    const success = await addItem({
      company_id: selectedCompany.id,
      name: selectedCompany.trade_name || selectedCompany.company_name,
      logo_url: '',
      instagram,
      whatsapp
    }, selectedFile);

    if (success) resetForm();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja remover este item?')) await deleteItem(id);
  };

  const formatUrl = (url: string, type: 'instagram' | 'whatsapp') => {
    if (!url) return '';
    if (type === 'instagram') {
      if (url.startsWith('@')) return `https://instagram.com/${url.slice(1)}`;
      if (!url.startsWith('http')) return `https://instagram.com/${url}`;
      return url;
    }
    if (!url.startsWith('http') && !url.startsWith('wa.me')) return `https://wa.me/${url.replace(/\D/g, '')}`;
    return url;
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" />Adicionar empresa ao carrossel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <Label htmlFor="logo-upload">Logo da empresa</Label>
              <div className="rounded-lg border-2 border-dashed border-border p-6 text-center">
                {previewUrl ? (
                  <div className="space-y-4">
                    <img src={previewUrl} alt="Preview" className="mx-auto max-h-32 rounded object-contain" />
                    <Button variant="outline" onClick={() => document.getElementById('logo-upload')?.click()}>Trocar logo</Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Selecione a logo usada no carrossel.</p>
                    <Button variant="outline" onClick={() => document.getElementById('logo-upload')?.click()}>Selecionar logo</Button>
                  </div>
                )}
              </div>
              <input id="logo-upload" type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="carousel-company">Empresa cadastrada *</Label>
                <select
                  id="carousel-company"
                  value={selectedCompanyId}
                  onChange={event => setSelectedCompanyId(event.target.value)}
                  disabled={companiesLoading}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">{companiesLoading ? 'Carregando empresas...' : 'Selecione uma empresa'}</option>
                  {availableCompanies.map(company => (
                    <option key={company.id} value={company.id}>{company.trade_name || company.company_name}</option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">O carrossel agora usa o cadastro central de empresas. Não é mais necessário cadastrar a mesma empresa novamente aqui.</p>
              </div>

              <div>
                <Label htmlFor="instagram">Instagram (opcional)</Label>
                <Input id="instagram" value={instagram} onChange={event => setInstagram(event.target.value)} placeholder="@empresa ou link completo" />
              </div>

              <div>
                <Label htmlFor="whatsapp">WhatsApp (opcional)</Label>
                <Input id="whatsapp" value={whatsapp} onChange={event => setWhatsapp(event.target.value)} placeholder="(82) 99999-9999 ou link completo" />
              </div>

              <Button onClick={handleAddItem} disabled={uploading || !selectedCompanyId || !selectedFile} className="w-full">
                {uploading ? 'Adicionando...' : 'Adicionar ao carrossel'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Itens do carrossel ({items.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center"><div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-primary" /><p className="mt-2 text-sm text-muted-foreground">Carregando...</p></div>
          ) : items.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">Nenhum item no carrossel ainda.</div>
          ) : (
            <div className="grid gap-4">
              {items.map(item => (
                <div key={item.id} className="flex items-center gap-4 rounded-lg border border-border bg-card p-4">
                  <div className="shrink-0"><img src={item.logo_url} alt={item.name} className="h-16 w-16 rounded border bg-white object-contain" onError={event => { (event.target as HTMLImageElement).src = '/placeholder.svg'; }} /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate font-medium">{item.name}</h3>
                      {!item.company_id && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">Cadastro legado</span>}
                    </div>
                    <div className="mt-1 flex items-center gap-4">
                      {item.instagram && <a href={formatUrl(item.instagram, 'instagram')} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-pink-600 hover:text-pink-700"><Instagram className="h-4 w-4" />Instagram</a>}
                      {item.whatsapp && <a href={formatUrl(item.whatsapp, 'whatsapp')} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-green-600 hover:text-green-700"><MessageCircle className="h-4 w-4" />WhatsApp</a>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => toggleStatus(item.id, item.status)} className={item.status === 'active' ? 'text-green-600' : 'text-muted-foreground'}>{item.status === 'active' ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)} className="text-red-600"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SimpleCarouselManager;
