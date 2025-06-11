
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useStorageManager } from '../hooks/useStorageManager';
import { CarouselItem } from '../types';

interface EditCarouselItemDialogProps {
  item: CarouselItem | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (id: string, data: Partial<CarouselItem>) => Promise<boolean>;
}

const EditCarouselItemDialog = ({ item, isOpen, onClose, onUpdate }: EditCarouselItemDialogProps) => {
  const { logos } = useStorageManager();
  const [formData, setFormData] = useState({
    name: '',
    logo_url: '',
    instagram: '',
    whatsapp: '',
    status: 'active' as 'active' | 'inactive'
  });
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (item) {
      console.log('Carregando dados do item para edição:', item);
      setFormData({
        name: item.name,
        logo_url: item.logo_url,
        instagram: item.instagram || '',
        whatsapp: item.whatsapp || '',
        status: item.status
      });
      setFormErrors({});
    }
  }, [item]);

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Nome da empresa é obrigatório';
    }
    
    if (!formData.logo_url) {
      errors.logo_url = 'Logo é obrigatória';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;

    console.log('Submetendo formulário de edição:', formData);

    if (!validateForm()) {
      console.log('Formulário inválido:', formErrors);
      return;
    }

    setSubmitting(true);
    
    try {
      const updateData = {
        name: formData.name.trim(),
        logo_url: formData.logo_url,
        instagram: formData.instagram.trim() || null,
        whatsapp: formData.whatsapp.trim() || null,
        status: formData.status
      };

      console.log('Dados para atualização:', updateData);
      
      const success = await onUpdate(item.id, updateData);

      if (success) {
        console.log('Item atualizado com sucesso');
        onClose();
      } else {
        console.log('Falha ao atualizar item');
      }
    } catch (error) {
      console.error('Erro no submit:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormErrors({});
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Bloco do Carrossel</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="edit_name">Nome da Empresa *</Label>
            <Input
              id="edit_name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Digite o nome da empresa"
              required
              className={formErrors.name ? 'border-red-500' : ''}
            />
            {formErrors.name && (
              <p className="text-sm text-red-500 mt-1">{formErrors.name}</p>
            )}
          </div>

          <div>
            <Label htmlFor="edit_logo">Logo *</Label>
            <Select
              value={formData.logo_url}
              onValueChange={(value) => setFormData({ ...formData, logo_url: value })}
            >
              <SelectTrigger className={formErrors.logo_url ? 'border-red-500' : ''}>
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
            {formErrors.logo_url && (
              <p className="text-sm text-red-500 mt-1">{formErrors.logo_url}</p>
            )}
          </div>

          <div>
            <Label htmlFor="edit_instagram">Link do Instagram</Label>
            <Input
              id="edit_instagram"
              value={formData.instagram}
              onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
              placeholder="https://instagram.com/empresa"
            />
          </div>

          <div>
            <Label htmlFor="edit_whatsapp">Link do WhatsApp</Label>
            <Input
              id="edit_whatsapp"
              value={formData.whatsapp}
              onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
              placeholder="https://wa.me/5511999999999"
            />
          </div>

          <div>
            <Label htmlFor="edit_status">Status</Label>
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
            {submitting ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditCarouselItemDialog;
