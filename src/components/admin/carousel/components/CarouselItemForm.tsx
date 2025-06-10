
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { useStorageManager } from '../hooks/useStorageManager';
import { CarouselItem } from '../types';

interface CarouselItemFormProps {
  onSubmit: (data: Omit<CarouselItem, 'id' | 'created_at'>) => Promise<boolean>;
}

const CarouselItemForm = ({ onSubmit }: CarouselItemFormProps) => {
  const { logos } = useStorageManager();
  const [formData, setFormData] = useState({
    name: '',
    logo_url: '',
    instagram: '',
    whatsapp: '',
    status: 'active' as 'active' | 'inactive'
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.logo_url) {
      alert('Nome da empresa e logo são obrigatórios');
      return;
    }

    setSubmitting(true);
    const success = await onSubmit(formData);
    
    if (success) {
      setFormData({
        name: '',
        logo_url: '',
        instagram: '',
        whatsapp: '',
        status: 'active'
      });
    }
    
    setSubmitting(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[#020817] dark:text-[#efc349]">
          <Plus className="w-5 h-5" />
          Cadastrar Novo Bloco do Carrossel
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nome da Empresa *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Digite o nome da empresa"
              required
            />
          </div>

          <div>
            <Label htmlFor="logo">Logo *</Label>
            <Select
              value={formData.logo_url}
              onValueChange={(value) => setFormData({ ...formData, logo_url: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma logo" />
              </SelectTrigger>
              <SelectContent>
                {logos.map((logo) => (
                  <SelectItem key={logo.name} value={logo.url}>
                    <div className="flex items-center gap-2">
                      <img src={logo.url} alt={logo.name} className="w-6 h-6 object-contain" />
                      {logo.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="instagram">Link do Instagram</Label>
            <Input
              id="instagram"
              value={formData.instagram}
              onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
              placeholder="https://instagram.com/empresa"
            />
          </div>

          <div>
            <Label htmlFor="whatsapp">Link do WhatsApp</Label>
            <Input
              id="whatsapp"
              value={formData.whatsapp}
              onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
              placeholder="https://wa.me/5511999999999"
            />
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value: 'active' | 'inactive') => setFormData({ ...formData, status: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="inactive">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button 
            type="submit" 
            disabled={submitting}
            className="w-full bg-[#efc349] hover:bg-[#efc349]/90 text-[#020817]"
          >
            {submitting ? "Salvando..." : "Adicionar ao Carrossel"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default CarouselItemForm;
