
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Announcement } from '@/types/announcements';
import { toast } from 'sonner';

interface EditAnnouncementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  announcement: Announcement;
  onSuccess: () => void;
}

export const EditAnnouncementDialog: React.FC<EditAnnouncementDialogProps> = ({
  open,
  onOpenChange,
  announcement,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(announcement);

  useEffect(() => {
    setFormData(announcement);
  }, [announcement]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { error } = await supabase
        .from('announcements')
        .update({
          title: formData.title,
          message: formData.message,
          target_type: formData.target_type,
          target_user_id: formData.target_user_id,
          theme: formData.theme,
          position: formData.position,
          action_button_text: formData.action_button_text,
          action_button_url: formData.action_button_url,
          expires_at: formData.expires_at
        })
        .eq('id', announcement.id);

      if (error) throw error;
      
      toast.success('Anúncio atualizado com sucesso!');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating announcement:', error);
      toast.error('Erro ao atualizar anúncio');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-extralight">Editar Anúncio</DialogTitle>
          <DialogDescription className="font-extralight">
            Modifique as configurações do pop-up informativo
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="title" className="font-extralight">Título *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Título do anúncio"
                required
                className="font-extralight"
              />
            </div>

            <div>
              <Label htmlFor="message" className="font-extralight">Mensagem *</Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Conteúdo da mensagem"
                rows={3}
                required
                className="font-extralight"
              />
            </div>

            <div>
              <Label className="font-extralight">Público-alvo *</Label>
              <Select 
                value={formData.target_type} 
                onValueChange={(value: any) => setFormData(prev => ({ ...prev, target_type: value }))}
              >
                <SelectTrigger className="font-extralight">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_users" className="font-extralight">Todos os usuários</SelectItem>
                  <SelectItem value="logged_users" className="font-extralight">Usuários logados</SelectItem>
                  <SelectItem value="public_visitors" className="font-extralight">Visitantes públicos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="font-extralight">Tema</Label>
                <Select 
                  value={formData.theme} 
                  onValueChange={(value: any) => setFormData(prev => ({ ...prev, theme: value }))}
                >
                  <SelectTrigger className="font-extralight">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal" className="font-extralight">Normal</SelectItem>
                    <SelectItem value="urgent" className="font-extralight">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="font-extralight">Posição</Label>
                <Select 
                  value={formData.position} 
                  onValueChange={(value: any) => setFormData(prev => ({ ...prev, position: value }))}
                >
                  <SelectTrigger className="font-extralight">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bottom_right" className="font-extralight">Canto inferior direito</SelectItem>
                    <SelectItem value="top_fixed" className="font-extralight">Topo fixo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="action_button_text" className="font-extralight">Texto do botão (opcional)</Label>
              <Input
                id="action_button_text"
                value={formData.action_button_text || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, action_button_text: e.target.value }))}
                placeholder="Ex: Ver Simulação"
                className="font-extralight"
              />
            </div>

            {formData.action_button_text && (
              <div>
                <Label htmlFor="action_button_url" className="font-extralight">URL do botão</Label>
                <Input
                  id="action_button_url"
                  value={formData.action_button_url || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, action_button_url: e.target.value }))}
                  placeholder="/simulador-irpf"
                  className="font-extralight"
                />
              </div>
            )}

            <div>
              <Label htmlFor="expires_at" className="font-extralight">Data de expiração (opcional)</Label>
              <Input
                id="expires_at"
                type="datetime-local"
                value={formData.expires_at ? new Date(formData.expires_at).toISOString().slice(0, 16) : ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  expires_at: e.target.value || undefined
                }))}
                className="font-extralight"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="font-extralight"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="font-extralight"
            >
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
