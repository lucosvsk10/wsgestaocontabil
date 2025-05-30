
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Megaphone, Send, Loader2 } from 'lucide-react';

interface User {
  id: string;
  email: string;
  user_metadata?: {
    name?: string;
  };
}

interface SendAnnouncementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SendAnnouncementModal = ({ open, onOpenChange }: SendAnnouncementModalProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    targetType: 'all', // 'all' or 'individual'
    targetUserId: '',
    expiresAt: ''
  });

  useEffect(() => {
    if (open) {
      fetchUsers();
    }
  }, [open]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.admin.listUsers();
      if (error) throw error;
      
      // Filtrar apenas usuários que não são admin
      const clientUsers = data.users.filter(user => {
        const role = user.user_metadata?.role || 'client';
        return role === 'client';
      });
      
      setUsers(clientUsers);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar a lista de usuários.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!formData.title.trim() || !formData.message.trim()) {
      toast({
        title: "Erro",
        description: "Título e mensagem são obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    if (formData.targetType === 'individual' && !formData.targetUserId) {
      toast({
        title: "Erro",
        description: "Selecione um usuário para envio individual.",
        variant: "destructive"
      });
      return;
    }

    setSending(true);
    try {
      const announcementData = {
        title: formData.title,
        message: formData.message,
        target_type: formData.targetType,
        target_user_id: formData.targetType === 'individual' ? formData.targetUserId : null,
        created_by: (await supabase.auth.getUser()).data.user?.id,
        expires_at: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : null,
        theme: 'info',
        position: 'bottom_right',
        is_active: true
      };

      const { error } = await supabase
        .from('announcements')
        .insert([announcementData]);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Comunicado enviado com sucesso."
      });

      // Reset form
      setFormData({
        title: '',
        message: '',
        targetType: 'all',
        targetUserId: '',
        expiresAt: ''
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao enviar comunicado:', error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar o comunicado.",
        variant: "destructive"
      });
    } finally {
      setSending(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-white dark:bg-[#0b1320] border-gray-200 dark:border-[#efc349]/30">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#020817] dark:text-[#efc349] font-extralight text-2xl">
            <Megaphone className="w-6 h-6" />
            Enviar Comunicado
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Título */}
          <div>
            <Label htmlFor="title" className="font-extralight">Título do Comunicado</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Digite o título do comunicado"
              className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30 font-extralight"
            />
          </div>

          {/* Mensagem */}
          <div>
            <Label htmlFor="message" className="font-extralight">Mensagem</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => handleInputChange('message', e.target.value)}
              placeholder="Digite a mensagem do comunicado"
              className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30 font-extralight"
              rows={4}
            />
          </div>

          {/* Tipo de envio */}
          <div>
            <Label htmlFor="targetType" className="font-extralight">Enviar para</Label>
            <Select value={formData.targetType} onValueChange={(value) => handleInputChange('targetType', value)}>
              <SelectTrigger className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30 font-extralight">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os clientes</SelectItem>
                <SelectItem value="individual">Cliente específico</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Seleção de usuário individual */}
          {formData.targetType === 'individual' && (
            <div>
              <Label htmlFor="targetUser" className="font-extralight">Selecionar Cliente</Label>
              {loading ? (
                <div className="flex items-center gap-2 p-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Carregando usuários...</span>
                </div>
              ) : (
                <Select value={formData.targetUserId} onValueChange={(value) => handleInputChange('targetUserId', value)}>
                  <SelectTrigger className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30 font-extralight">
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.user_metadata?.name || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Data de expiração */}
          <div>
            <Label htmlFor="expiresAt" className="font-extralight">Data de Expiração (Opcional)</Label>
            <Input
              id="expiresAt"
              type="datetime-local"
              value={formData.expiresAt}
              onChange={(e) => handleInputChange('expiresAt', e.target.value)}
              className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30 font-extralight"
            />
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="font-extralight border-gray-300 dark:border-[#efc349]/30"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSend}
              disabled={sending}
              className="font-extralight bg-[#efc349] text-[#020817] hover:bg-[#efc349]/90"
            >
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Enviar Comunicado
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
