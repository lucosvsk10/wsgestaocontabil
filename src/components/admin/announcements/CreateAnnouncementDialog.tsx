
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { CreateAnnouncementData } from '@/types/announcements';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface CreateAnnouncementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const CreateAnnouncementDialog: React.FC<CreateAnnouncementDialogProps> = ({
  open,
  onOpenChange,
  onSuccess
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateAnnouncementData>({
    title: '',
    message: '',
    target_type: 'all_users',
    theme: 'normal',
    position: 'bottom_right'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('announcements')
        .insert([{
          ...formData,
          created_by: user.id,
          expires_at: formData.expires_at?.toISOString()
        }]);

      if (error) throw error;
      
      toast.success('Anúncio criado com sucesso!');
      onSuccess();
      onOpenChange(false);
      
      // Reset form
      setFormData({
        title: '',
        message: '',
        target_type: 'all_users',
        theme: 'normal',
        position: 'bottom_right'
      });
    } catch (error) {
      console.error('Error creating announcement:', error);
      toast.error('Erro ao criar anúncio');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-extralight">Criar Novo Anúncio</DialogTitle>
          <DialogDescription className="font-extralight">
            Configure um novo pop-up informativo para seus usuários
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
                value={formData.expires_at ? formData.expires_at.toISOString().slice(0, 16) : ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  expires_at: e.target.value ? new Date(e.target.value) : undefined 
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
              {loading ? 'Criando...' : 'Criar Anúncio'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
