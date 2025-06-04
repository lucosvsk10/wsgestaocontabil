
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Edit, Trash2, Megaphone, Calendar, User } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

interface Communication {
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

export const CommunicationsView: React.FC = () => {
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const [newCommunication, setNewCommunication] = useState({
    title: '',
    message: '',
    theme: 'info',
    action_button_text: '',
    action_button_url: '',
    expires_at: ''
  });

  useEffect(() => {
    fetchCommunications();
  }, []);

  const fetchCommunications = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('client_announcements')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setCommunications(data || []);
    } catch (error) {
      console.error('Erro ao carregar comunicados:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os comunicados.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createCommunication = async () => {
    try {
      setIsSaving(true);
      const { data, error } = await supabase
        .from('client_announcements')
        .insert([{
          ...newCommunication,
          expires_at: newCommunication.expires_at || null,
          action_button_text: newCommunication.action_button_text || null,
          action_button_url: newCommunication.action_button_url || null,
          created_by: (await supabase.auth.getUser()).data.user?.id
        }])
        .select();
      
      if (error) throw error;
      
      if (data) {
        setCommunications(prev => [data[0], ...prev]);
        setNewCommunication({
          title: '',
          message: '',
          theme: 'info',
          action_button_text: '',
          action_button_url: '',
          expires_at: ''
        });
        setIsCreateDialogOpen(false);
        toast({
          title: "Sucesso",
          description: "Comunicado criado com sucesso!"
        });
      }
    } catch (error) {
      console.error('Erro ao criar comunicado:', error);
      toast({
        title: "Erro",
        description: "Não foi possível criar o comunicado.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const deleteCommunication = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este comunicado?')) return;
    
    try {
      const { error } = await supabase
        .from('client_announcements')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setCommunications(prev => prev.filter(comm => comm.id !== id));
      toast({
        title: "Sucesso",
        description: "Comunicado excluído com sucesso!"
      });
    } catch (error) {
      console.error('Erro ao excluir comunicado:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o comunicado.",
        variant: "destructive"
      });
    }
  };

  const getThemeColor = (theme: string) => {
    switch (theme) {
      case 'success': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'warning': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'error': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'info': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const filteredCommunications = communications.filter(comm =>
    comm.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    comm.message.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with search and create button */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar comunicados..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30 font-extralight"
          />
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#020817] hover:bg-[#0f172a] text-white dark:bg-transparent dark:border dark:border-[#efc349] dark:text-[#efc349] dark:hover:bg-[#efc349]/10 font-extralight">
              <Plus className="h-4 w-4 mr-2" />
              Novo Comunicado
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-extralight text-[#020817] dark:text-[#efc349]">
                Criar Novo Comunicado
              </DialogTitle>
              <DialogDescription className="font-extralight">
                Crie um comunicado para ser exibido aos clientes
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-[#020817] dark:text-white font-extralight">Título</Label>
                <Input
                  value={newCommunication.title}
                  onChange={(e) => setNewCommunication(prev => ({...prev, title: e.target.value}))}
                  placeholder="Digite o título do comunicado"
                  className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30 font-extralight"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-[#020817] dark:text-white font-extralight">Mensagem</Label>
                <Textarea
                  value={newCommunication.message}
                  onChange={(e) => setNewCommunication(prev => ({...prev, message: e.target.value}))}
                  placeholder="Digite a mensagem do comunicado"
                  rows={4}
                  className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30 font-extralight"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#020817] dark:text-white font-extralight">Tema</Label>
                  <Select value={newCommunication.theme} onValueChange={(value) => setNewCommunication(prev => ({...prev, theme: value}))}>
                    <SelectTrigger className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Informação</SelectItem>
                      <SelectItem value="success">Sucesso</SelectItem>
                      <SelectItem value="warning">Aviso</SelectItem>
                      <SelectItem value="error">Erro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-[#020817] dark:text-white font-extralight">Data de Expiração (opcional)</Label>
                  <Input
                    type="datetime-local"
                    value={newCommunication.expires_at}
                    onChange={(e) => setNewCommunication(prev => ({...prev, expires_at: e.target.value}))}
                    className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30 font-extralight"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#020817] dark:text-white font-extralight">Texto do Botão (opcional)</Label>
                  <Input
                    value={newCommunication.action_button_text}
                    onChange={(e) => setNewCommunication(prev => ({...prev, action_button_text: e.target.value}))}
                    placeholder="Ex: Saiba mais"
                    className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30 font-extralight"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-[#020817] dark:text-white font-extralight">URL do Botão (opcional)</Label>
                  <Input
                    value={newCommunication.action_button_url}
                    onChange={(e) => setNewCommunication(prev => ({...prev, action_button_url: e.target.value}))}
                    placeholder="https://..."
                    className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30 font-extralight"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setIsCreateDialogOpen(false)}
                  className="font-extralight"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={createCommunication} 
                  disabled={isSaving || !newCommunication.title || !newCommunication.message}
                  className="bg-[#020817] hover:bg-[#0f172a] text-white dark:bg-transparent dark:border dark:border-[#efc349] dark:text-[#efc349] dark:hover:bg-[#efc349]/10 font-extralight"
                >
                  {isSaving ? <LoadingSpinner /> : 'Criar Comunicado'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Communications list */}
      <div className="space-y-4">
        {filteredCommunications.length === 0 ? (
          <Card className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Megaphone className="h-12 w-12 text-gray-400 dark:text-white/40 mb-4" />
              <h3 className="text-lg font-extralight text-[#020817] dark:text-white mb-2">
                Nenhum comunicado encontrado
              </h3>
              <p className="text-gray-600 dark:text-white/70 text-center font-extralight">
                {searchTerm ? 'Nenhum comunicado corresponde aos termos de busca.' : 'Crie seu primeiro comunicado para começar.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredCommunications.map((communication) => (
            <Card key={communication.id} className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30 hover:shadow-lg dark:hover:shadow-none transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-extralight text-[#020817] dark:text-white">
                        {communication.title}
                      </h3>
                      <Badge className={`${getThemeColor(communication.theme)} font-extralight`}>
                        {communication.theme === 'info' ? 'Informação' :
                         communication.theme === 'success' ? 'Sucesso' :
                         communication.theme === 'warning' ? 'Aviso' : 'Erro'}
                      </Badge>
                    </div>
                    
                    <p className="text-gray-600 dark:text-white/70 mb-3 font-extralight">
                      {communication.message}
                    </p>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-white/60">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span className="font-extralight">
                          {format(new Date(communication.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      {communication.expires_at && (
                        <div className="flex items-center gap-1">
                          <span className="font-extralight">
                            Expira em: {format(new Date(communication.expires_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-red-200 dark:border-red-400/30 hover:bg-red-50 dark:hover:bg-red-400/10 text-red-600 dark:text-red-400 font-extralight"
                      onClick={() => deleteCommunication(communication.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
