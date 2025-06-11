
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

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name || '',
        logo_url: item.logo_url || '',
        instagram: item.instagram || '',
        whatsapp: item.whatsapp || '',
        status: item.status || 'active'
      });
    }
  }, [item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;

    if (!formData.name.trim() || !formData.logo_url) {
      alert('Nome da empresa e logo são obrigatórios');
      return;
    }

    setSubmitting(true);
    
    try {
      const updateData: Partial<CarouselItem> = {
        name: formData.name.trim(),
        logo_url: formData.logo_url,
        instagram: formData.instagram.trim() || null,
        whatsapp: formData.whatsapp.trim() || null,
        status: formData.status
      };

      const success = await onUpdate(item.id, updateData);

      if (success) {
        onClose();
      }
    } catch (error) {
      console.error('Erro ao atualizar item:', error);
      alert('Erro ao atualizar item. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md bg-white dark:bg-[#020817] border-gray-200 dark:border-[#efc349]/30">
        <DialogHeader>
          <DialogTitle className="text-[#020817] dark:text-[#efc349]">
            Editar Bloco do Carrossel
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="edit_name" className="text-[#020817] dark:text-white">
              Nome da Empresa *
            </Label>
            <Input
              id="edit_name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Digite o nome da empresa"
              required
              disabled={submitting}
            />
          </div>

          <div>
            <Label htmlFor="edit_logo" className="text-[#020817] dark:text-white">
              Logo *
            </Label>
            <Select
              value={formData.logo_url}
              onValueChange={(value) => setFormData({ ...formData, logo_url: value })}
              disabled={submitting}
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
            <Label htmlFor="edit_instagram" className="text-[#020817] dark:text-white">
              Link do Instagram
            </Label>
            <Input
              id="edit_instagram"
              value={formData.instagram}
              onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
              placeholder="https://instagram.com/empresa"
              disabled={submitting}
            />
          </div>

          <div>
            <Label htmlFor="edit_whatsapp" className="text-[#020817] dark:text-white">
              Link do WhatsApp
            </Label>
            <Input
              id="edit_whatsapp"
              value={formData.whatsapp}
              onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
              placeholder="https://wa.me/5511999999999"
              disabled={submitting}
            />
          </div>

          <div>
            <Label htmlFor="edit_status" className="text-[#020817] dark:text-white">
              Status
            </Label>
            <Select
              value={formData.status}
              onValueChange={(value: 'active' | 'inactive') => setFormData({ ...formData, status: value })}
              disabled={submitting}
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
            className="w-full bg-[#efc349] hover:bg-[#efc349]/90 text-[#020817] font-medium"
          >
            {submitting ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditCarouselItemDialog;
