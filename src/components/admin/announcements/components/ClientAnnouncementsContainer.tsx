import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Bell, Plus, Edit, Trash2, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";

interface ClientAnnouncement {
  id: string;
  title: string;
  message: string;
  theme: string;
  action_button_text?: string;
  action_button_url?: string;
  expires_at?: string;
  created_at: string;
  created_by: string;
}

export const ClientAnnouncementsContainer = () => {
  const [announcements, setAnnouncements] = useState<ClientAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<ClientAnnouncement | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    theme: "info",
    action_button_text: "",
    action_button_url: "",
    expires_at: ""
  });
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('client_announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error) {
      console.error('Erro ao buscar comunicados:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os comunicados.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user?.id) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado.",
        variant: "destructive"
      });
      return;
    }

    try {
      const dataToSave = {
        ...formData,
        expires_at: formData.expires_at || null,
        created_by: user.id
      };

      if (editingAnnouncement) {
        const { error } = await supabase
          .from('client_announcements')
          .update(dataToSave)
          .eq('id', editingAnnouncement.id);

        if (error) throw error;
        toast({
          title: "Sucesso",
          description: "Comunicado atualizado com sucesso."
        });
      } else {
        const { error } = await supabase
          .from('client_announcements')
          .insert([dataToSave]);

        if (error) throw error;
        toast({
          title: "Sucesso",
          description: "Comunicado criado com sucesso."
        });
      }

      fetchAnnouncements();
      handleCloseDialog();
    } catch (error) {
      console.error('Erro ao salvar comunicado:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o comunicado.",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (announcementId: string) => {
    if (!confirm('Deseja realmente excluir este comunicado?')) return;

    try {
      const { error } = await supabase
        .from('client_announcements')
        .delete()
        .eq('id', announcementId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Comunicado excluído com sucesso."
      });
      fetchAnnouncements();
    } catch (error) {
      console.error('Erro ao excluir comunicado:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o comunicado.",
        variant: "destructive"
      });
    }
  };

  const handleCloseDialog = () => {
    setIsCreateDialogOpen(false);
    setEditingAnnouncement(null);
    setFormData({
      title: "",
      message: "",
      theme: "info",
      action_button_text: "",
      action_button_url: "",
      expires_at: ""
    });
  };

  const getThemeColor = (theme: string) => {
    switch (theme) {
      case 'info': return 'bg-blue-600 hover:bg-blue-700 text-white';
      case 'warning': return 'bg-yellow-600 hover:bg-yellow-700 text-white';
      case 'error': return 'bg-red-600 hover:bg-red-700 text-white';
      case 'success': return 'bg-green-600 hover:bg-green-700 text-white';
      default: return 'bg-blue-600 hover:bg-blue-700 text-white';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Bell className="h-12 w-12 text-[#efc349] mx-auto mb-4 animate-spin" />
          <p className="text-[#020817] dark:text-white font-extralight">Carregando comunicados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl text-[#020817] dark:text-[#efc349] font-extralight">
            Comunicados para Clientes
          </h2>
          <p className="text-gray-600 dark:text-white/70 font-extralight">
            Gerencie comunicados que aparecem no dashboard dos clientes
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#020817] dark:bg-transparent border border-[#efc349] text-white dark:text-[#efc349] hover:bg-[#020817]/90 dark:hover:bg-[#efc349]/10">
              <Plus className="h-4 w-4 mr-2" />
              Novo Comunicado
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-white dark:bg-[#0b1320] border-gray-200 dark:border-[#efc349]/30 max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-[#020817] dark:text-[#efc349] font-extralight">
                {editingAnnouncement ? 'Editar Comunicado' : 'Novo Comunicado'}
              </DialogTitle>
              <DialogDescription className="text-gray-600 dark:text-white/70 font-extralight">
                {editingAnnouncement ? 'Edite as informações do comunicado' : 'Crie um novo comunicado para os clientes'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-[#020817] dark:text-white font-extralight">
                  Título
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message" className="text-[#020817] dark:text-white font-extralight">
                  Mensagem
                </Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => setFormData({...formData, message: e.target.value})}
                  className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30"
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="theme" className="text-[#020817] dark:text-white font-extralight">
                    Tema
                  </Label>
                  <Select value={formData.theme} onValueChange={(value) => setFormData({...formData, theme: value})}>
                    <SelectTrigger className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-[#0b1320] border-gray-200 dark:border-[#efc349]/30">
                      <SelectItem value="info">Informativo</SelectItem>
                      <SelectItem value="warning">Aviso</SelectItem>
                      <SelectItem value="error">Erro</SelectItem>
                      <SelectItem value="success">Sucesso</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expires_at" className="text-[#020817] dark:text-white font-extralight">
                    Expira em (opcional)
                  </Label>
                  <Input
                    id="expires_at"
                    type="datetime-local"
                    value={formData.expires_at}
                    onChange={(e) => setFormData({...formData, expires_at: e.target.value})}
                    className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="action_button_text" className="text-[#020817] dark:text-white font-extralight">
                    Texto do Botão (opcional)
                  </Label>
                  <Input
                    id="action_button_text"
                    value={formData.action_button_text}
                    onChange={(e) => setFormData({...formData, action_button_text: e.target.value})}
                    className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="action_button_url" className="text-[#020817] dark:text-white font-extralight">
                    URL do Botão (opcional)
                  </Label>
                  <Input
                    id="action_button_url"
                    value={formData.action_button_url}
                    onChange={(e) => setFormData({...formData, action_button_url: e.target.value})}
                    className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleCloseDialog} className="border-gray-200 dark:border-[#efc349]/30">
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSave}
                  className="bg-[#020817] dark:bg-transparent border border-[#efc349] text-white dark:text-[#efc349] hover:bg-[#020817]/90 dark:hover:bg-[#efc349]/10"
                >
                  {editingAnnouncement ? 'Atualizar' : 'Criar'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {announcements.map((announcement, index) => (
          <motion.div
            key={announcement.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <Card className="bg-white dark:bg-[#0b1320] border-gray-200 dark:border-[#efc349]/20 hover:shadow-lg dark:hover:shadow-none transition-all duration-300">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <CardTitle className="text-[#020817] dark:text-white font-extralight text-lg">
                      {announcement.title}
                    </CardTitle>
                    <Badge className={getThemeColor(announcement.theme)}>
                      {announcement.theme}
                    </Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingAnnouncement(announcement);
                        setFormData({
                          title: announcement.title,
                          message: announcement.message,
                          theme: announcement.theme,
                          action_button_text: announcement.action_button_text || "",
                          action_button_url: announcement.action_button_url || "",
                          expires_at: announcement.expires_at ? announcement.expires_at.slice(0, 16) : ""
                        });
                        setIsCreateDialogOpen(true);
                      }}
                      className="h-8 w-8 p-0 hover:bg-[#efc349]/10"
                    >
                      <Edit className="h-4 w-4 text-[#020817] dark:text-[#efc349]" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(announcement.id)}
                      className="h-8 w-8 p-0 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                <p className="text-gray-600 dark:text-gray-300 font-extralight text-sm">
                  {announcement.message}
                </p>

                {announcement.action_button_text && announcement.action_button_url && (
                  <Button 
                    size="sm"
                    variant="outline"
                    className="w-full border-[#efc349]/30 hover:bg-[#efc349]/10"
                    onClick={() => window.open(announcement.action_button_url, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-1" />
                    {announcement.action_button_text}
                  </Button>
                )}

                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 dark:text-gray-400 font-extralight">
                    {new Date(announcement.created_at).toLocaleDateString('pt-BR')}
                  </span>
                  {announcement.expires_at && (
                    <span className="text-red-600 dark:text-red-400 font-extralight">
                      Expira: {new Date(announcement.expires_at).toLocaleDateString('pt-BR')}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {announcements.length === 0 && (
        <Card className="bg-white dark:bg-[#0b1320] border-gray-200 dark:border-[#efc349]/30">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bell className="h-12 w-12 text-gray-400 dark:text-white/40 mb-4" />
            <h3 className="text-lg font-extralight text-[#020817] dark:text-white mb-2">
              Nenhum comunicado cadastrado
            </h3>
            <p className="text-gray-600 dark:text-white/70 text-center font-extralight">
              Crie comunicados para informar seus clientes.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
