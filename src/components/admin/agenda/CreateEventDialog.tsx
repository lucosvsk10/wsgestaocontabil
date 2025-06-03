
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CreateEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateEvent: (eventData: {
    title: string;
    description: string;
    date: string;
    category: string;
  }) => Promise<boolean>;
}

export const CreateEventDialog = ({ open, onOpenChange, onCreateEvent }: CreateEventDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    date: "",
    category: "fiscal"
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const success = await onCreateEvent(formData);
    
    if (success) {
      setFormData({
        title: "",
        description: "",
        date: "",
        category: "fiscal"
      });
      onOpenChange(false);
    }
    
    setIsLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-white dark:bg-[#0b1320] border-[#e6e6e6] dark:border-[#efc349]/20">
        <DialogHeader>
          <DialogTitle className="font-extralight text-[#020817] dark:text-[#efc349]">
            Criar Novo Evento
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title" className="font-extralight text-[#020817] dark:text-white">
              Título *
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              required
              className="bg-white dark:bg-[#0b1320] border-[#e6e6e6] dark:border-[#efc349]/20 text-[#020817] dark:text-white"
            />
          </div>

          <div>
            <Label htmlFor="date" className="font-extralight text-[#020817] dark:text-white">
              Data *
            </Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
              required
              className="bg-white dark:bg-[#0b1320] border-[#e6e6e6] dark:border-[#efc349]/20 text-[#020817] dark:text-white"
            />
          </div>

          <div>
            <Label htmlFor="category" className="font-extralight text-[#020817] dark:text-white">
              Categoria
            </Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
            >
              <SelectTrigger className="bg-white dark:bg-[#0b1320] border-[#e6e6e6] dark:border-[#efc349]/20 text-[#020817] dark:text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-[#0b1320] border-[#e6e6e6] dark:border-[#efc349]/20">
                <SelectItem value="fiscal">Fiscal</SelectItem>
                <SelectItem value="contabil">Contábil</SelectItem>
                <SelectItem value="trabalhista">Trabalhista</SelectItem>
                <SelectItem value="outros">Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="description" className="font-extralight text-[#020817] dark:text-white">
              Descrição
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="bg-white dark:bg-[#0b1320] border-[#e6e6e6] dark:border-[#efc349]/20 text-[#020817] dark:text-white"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-[#e6e6e6] dark:border-[#efc349]/20 text-[#020817] dark:text-white hover:bg-gray-50 dark:hover:bg-[#efc349]/10"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-[#020817] hover:bg-[#020817]/90 text-white dark:bg-transparent dark:border dark:border-[#efc349] dark:text-[#efc349] dark:hover:bg-[#efc349]/10"
            >
              {isLoading ? "Criando..." : "Criar Evento"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
