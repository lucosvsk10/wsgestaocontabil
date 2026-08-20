
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Upload, Instagram, MessageCircle, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSimpleCarousel } from './hooks/useSimpleCarousel';

const SimpleCarouselManager = () => {
  const { toast } = useToast();
  const {
    items,
    loading,
    uploading,
    addItem,
    updateItem,
    deleteItem,
    toggleStatus
  } = useSimpleCarousel();

  const [newItem, setNewItem] = useState({
    name: '',
    logo_url: '',
    instagram: '',
    whatsapp: ''
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Erro",
          description: "Por favor, selecione uma imagem válida",
          variant: "destructive"
        });
        return;
      }
      
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleAddItem = async () => {
    if (!newItem.name || !selectedFile) {
      toast({
        title: "Erro",
        description: "Nome da empresa e logo são obrigatórios",
        variant: "destructive"
      });
      return;
    }

    const success = await addItem(newItem, selectedFile);
    if (success) {
      setNewItem({ name: '', logo_url: '', instagram: '', whatsapp: '' });
      setSelectedFile(null);
      setPreviewUrl('');
      // Reset file input
      const fileInput = document.getElementById('logo-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja remover este item?')) {
      await deleteItem(id);
    }
  };

  const formatUrl = (url: string, type: 'instagram' | 'whatsapp') => {
    if (!url) return '';
    
    if (type === 'instagram') {
      if (url.startsWith('@')) return `https://instagram.com/${url.slice(1)}`;
      if (!url.startsWith('http')) return `https://instagram.com/${url}`;
      return url;
    }
    
    if (type === 'whatsapp') {
      if (!url.startsWith('http') && !url.startsWith('wa.me')) {
        const cleanNumber = url.replace(/\D/g, '');
        return `https://wa.me/${cleanNumber}`;
      }
      return url;
    }
    
    return url;
  };

  return (
    <div className="space-y-8">
      {/* Seção de Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Adicionar Novo Cliente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Upload de Logo */}
            <div className="space-y-4">
              <Label htmlFor="logo-upload">Logo da Empresa</Label>
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                {previewUrl ? (
                  <div className="space-y-4">
                    <img 
                      src={previewUrl} 
                      alt="Preview" 
                      className="max-h-32 mx-auto object-contain rounded"
                    />
                    <Button 
                      variant="outline" 
                      onClick={() => document.getElementById('logo-upload')?.click()}
                    >
                      Trocar Logo
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-12 h-12 mx-auto text-gray-400" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Clique para selecionar ou arraste a logo aqui
                    </p>
                    <Button 
                      variant="outline" 
                      onClick={() => document.getElementById('logo-upload')?.click()}
                    >
                      Selecionar Logo
                    </Button>
                  </div>
                )}
              </div>
              <input
                id="logo-upload"
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {/* Dados da Empresa */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="company-name">Nome da Empresa *</Label>
                <Input
                  id="company-name"
                  value={newItem.name}
                  onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Digite o nome da empresa"
                />
              </div>

              <div>
                <Label htmlFor="instagram">Instagram (opcional)</Label>
                <Input
                  id="instagram"
                  value={newItem.instagram}
                  onChange={(e) => setNewItem(prev => ({ ...prev, instagram: e.target.value }))}
                  placeholder="@empresa ou link completo"
                />
              </div>

              <div>
                <Label htmlFor="whatsapp">WhatsApp (opcional)</Label>
                <Input
                  id="whatsapp"
                  value={newItem.whatsapp}
                  onChange={(e) => setNewItem(prev => ({ ...prev, whatsapp: e.target.value }))}
                  placeholder="(11) 99999-9999 ou link completo"
                />
              </div>

              <Button 
                onClick={handleAddItem} 
                disabled={uploading || !newItem.name || !selectedFile}
                className="w-full"
              >
                {uploading ? 'Adicionando...' : 'Adicionar ao Carrossel'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Itens */}
      <Card>
        <CardHeader>
          <CardTitle>Itens do Carrossel ({items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#efc349] mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Carregando...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-400">Nenhum item no carrossel ainda.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center gap-4 p-4 border rounded-lg ${
                    item.status === 'active' 
                      ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20' 
                      : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50'
                  }`}
                >
                  {/* Logo */}
                  <div className="flex-shrink-0">
                    <img 
                      src={item.logo_url} 
                      alt={item.name}
                      className="w-16 h-16 object-contain rounded border bg-white"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder.svg';
                      }}
                    />
                  </div>

                  {/* Informações */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 dark:text-white truncate">
                      {item.name}
                    </h3>
                    <div className="flex items-center gap-4 mt-1">
                      {item.instagram && (
                        <a 
                          href={formatUrl(item.instagram, 'instagram')} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-sm text-pink-600 hover:text-pink-700"
                        >
                          <Instagram className="w-4 h-4" />
                          Instagram
                        </a>
                      )}
                      {item.whatsapp && (
                        <a 
                          href={formatUrl(item.whatsapp, 'whatsapp')} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-sm text-green-600 hover:text-green-700"
                        >
                          <MessageCircle className="w-4 h-4" />
                          WhatsApp
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Status e Ações */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleStatus(item.id, item.status)}
                      className={
                        item.status === 'active' 
                          ? 'text-green-600 hover:text-green-700' 
                          : 'text-gray-400 hover:text-gray-600'
                      }
                    >
                      {item.status === 'active' ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(item.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SimpleCarouselManager;
