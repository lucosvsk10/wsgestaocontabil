
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Calendar, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import { Announcement, CreateAnnouncementData } from '@/types/announcements';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface EditAnnouncementDialogProps {
  announcement: Announcement;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditAnnouncementDialog = ({ announcement, open, onOpenChange }: EditAnnouncementDialogProps) => {
  const [expirationDate, setExpirationDate] = useState<Date | undefined>();
  const [showPreview, setShowPreview] = useState(false);
  
  const { updateAnnouncement, isUpdating } = useAnnouncements();
  
  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<CreateAnnouncementData>();

  useEffect(() => {
    if (announcement) {
      setValue('title', announcement.title);
      setValue('message', announcement.message);
      setValue('target_type', announcement.target_type);
      setValue('theme', announcement.theme);
      setValue('position', announcement.position);
      setValue('action_button_text', announcement.action_button_text || '');
      setValue('action_button_url', announcement.action_button_url || '');
      
      if (announcement.expires_at) {
        setExpirationDate(new Date(announcement.expires_at));
      }
    }
  }, [announcement, setValue]);

  const watchedValues = watch();

  const onSubmit = (data: CreateAnnouncementData) => {
    updateAnnouncement({
      id: announcement.id,
      data: {
        ...data,
        expires_at: expirationDate || null
      }
    });
    
    onOpenChange(false);
  };

  const handleClose = () => {
    reset();
    setExpirationDate(undefined);
    setShowPreview(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl bg-white dark:bg-[#0b1320] border-gray-200 dark:border-[#efc349]/30">
        <DialogHeader>
          <DialogTitle className="text-xl font-extralight text-gray-900 dark:text-white">
            Editar Anúncio
          </DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-300 font-extralight">
            Modifique os detalhes do pop-up informativo.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-extralight text-gray-700 dark:text-gray-300">
                Título *
              </Label>
              <Input
                id="title"
                {...register('title', { required: 'Título é obrigatório' })}
                className="bg-white dark:bg-[#0b1320] border-gray-300 dark:border-[#efc349]/50 font-extralight"
                placeholder="Digite o título do anúncio"
              />
              {errors.title && (
                <p className="text-xs text-red-600 font-extralight">{errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="target_type" className="text-sm font-extralight text-gray-700 dark:text-gray-300">
                Público-alvo *
              </Label>
              <Select onValueChange={(value) => setValue('target_type', value as any)} value={watchedValues.target_type}>
                <SelectTrigger className="bg-white dark:bg-[#0b1320] border-gray-300 dark:border-[#efc349]/50 font-extralight">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-[#0b1320] border-gray-300 dark:border-[#efc349]/50">
                  <SelectItem value="logged_users" className="font-extralight">Usuários logados</SelectItem>
                  <SelectItem value="public_visitors" className="font-extralight">Visitantes públicos</SelectItem>
                  <SelectItem value="all_users" className="font-extralight">Todos os usuários</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message" className="text-sm font-extralight text-gray-700 dark:text-gray-300">
              Mensagem *
            </Label>
            <Textarea
              id="message"
              {...register('message', { required: 'Mensagem é obrigatória' })}
              className="bg-white dark:bg-[#0b1320] border-gray-300 dark:border-[#efc349]/50 font-extralight min-h-[80px]"
              placeholder="Digite a mensagem do anúncio"
            />
            {errors.message && (
              <p className="text-xs text-red-600 font-extralight">{errors.message.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="theme" className="text-sm font-extralight text-gray-700 dark:text-gray-300">
                Tema visual
              </Label>
              <Select onValueChange={(value) => setValue('theme', value as any)} value={watchedValues.theme}>
                <SelectTrigger className="bg-white dark:bg-[#0b1320] border-gray-300 dark:border-[#efc349]/50 font-extralight">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-[#0b1320] border-gray-300 dark:border-[#efc349]/50">
                  <SelectItem value="normal" className="font-extralight">Normal</SelectItem>
                  <SelectItem value="urgent" className="font-extralight">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="position" className="text-sm font-extralight text-gray-700 dark:text-gray-300">
                Posição
              </Label>
              <Select onValueChange={(value) => setValue('position', value as any)} value={watchedValues.position}>
                <SelectTrigger className="bg-white dark:bg-[#0b1320] border-gray-300 dark:border-[#efc349]/50 font-extralight">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-[#0b1320] border-gray-300 dark:border-[#efc349]/50">
                  <SelectItem value="bottom_right" className="font-extralight">Inferior direita</SelectItem>
                  <SelectItem value="top_fixed" className="font-extralight">Topo da tela</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="action_button_text" className="text-sm font-extralight text-gray-700 dark:text-gray-300">
                Texto do botão (opcional)
              </Label>
              <Input
                id="action_button_text"
                {...register('action_button_text')}
                className="bg-white dark:bg-[#0b1320] border-gray-300 dark:border-[#efc349]/50 font-extralight"
                placeholder="Ex: Ver mais"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="action_button_url" className="text-sm font-extralight text-gray-700 dark:text-gray-300">
                URL do botão (opcional)
              </Label>
              <Input
                id="action_button_url"
                {...register('action_button_url')}
                className="bg-white dark:bg-[#0b1320] border-gray-300 dark:border-[#efc349]/50 font-extralight"
                placeholder="https://exemplo.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-extralight text-gray-700 dark:text-gray-300">
              Data de expiração (opcional)
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-extralight bg-white dark:bg-[#0b1320] border-gray-300 dark:border-[#efc349]/50"
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {expirationDate ? format(expirationDate, "PPP", { locale: ptBR }) : "Selecionar data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-white dark:bg-[#0b1320] border-gray-300 dark:border-[#efc349]/50">
                <CalendarComponent
                  mode="single"
                  selected={expirationDate}
                  onSelect={setExpirationDate}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowPreview(!showPreview)}
              className="font-extralight border-gray-300 dark:border-[#efc349]/50"
            >
              <Eye className="w-4 h-4 mr-2" />
              {showPreview ? 'Ocultar' : 'Pré-visualizar'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="font-extralight border-gray-300 dark:border-[#efc349]/50"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isUpdating}
              className="bg-[#efc349] hover:bg-[#efc349]/80 text-black font-extralight"
            >
              {isUpdating ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </form>

        {/* Preview */}
        {showPreview && watchedValues.title && watchedValues.message && (
          <div className="mt-4 p-4 border border-gray-200 dark:border-[#efc349]/30 rounded-lg bg-gray-50 dark:bg-[#0b1320]/50">
            <p className="text-sm text-gray-600 dark:text-gray-300 font-extralight mb-2">Pré-visualização:</p>
            <div className={`max-w-[300px] p-4 rounded-lg border border-[#efc349] backdrop-blur-sm ${
              watchedValues.theme === 'urgent' 
                ? 'bg-red-50 dark:bg-red-900/20' 
                : 'bg-[#f8f4ef] dark:bg-[#0b0f1c]'
            }`}>
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-extralight text-[#1a1a1a] dark:text-[#f4f4f4] text-sm font-medium">
                  {watchedValues.title}
                </h4>
                <button className="text-gray-400 hover:text-gray-600 text-xs">×</button>
              </div>
              <p className="text-xs text-[#1a1a1a] dark:text-[#f4f4f4] font-extralight mb-3">
                {watchedValues.message}
              </p>
              {watchedValues.action_button_text && (
                <button className="text-xs bg-[#efc349] text-black px-2 py-1 rounded font-extralight">
                  {watchedValues.action_button_text}
                </button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
