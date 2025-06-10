
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Trash2 } from 'lucide-react';
import { useStorageManager } from '../hooks/useStorageManager';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const LogoUploadPanel = () => {
  const { logos, loading, uploadLogo, deleteLogo } = useStorageManager();
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedLogoToDelete, setSelectedLogoToDelete] = useState('');

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione apenas arquivos de imagem (PNG, JPG, GIF)');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('A imagem deve ter no máximo 2MB');
      return;
    }

    setSelectedFile(file);
    setUploadDialogOpen(true);
  };

  const handleUpload = async () => {
    if (!selectedFile || !companyName.trim()) {
      alert('Por favor, preencha o nome da empresa');
      return;
    }

    setUploading(true);
    const result = await uploadLogo(selectedFile, companyName);
    setUploading(false);

    if (result) {
      setSelectedFile(null);
      setCompanyName('');
      setUploadDialogOpen(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedLogoToDelete) return;

    await deleteLogo(selectedLogoToDelete);
    setDeleteDialogOpen(false);
    setSelectedLogoToDelete('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[#020817] dark:text-[#efc349]">
          <Upload className="w-5 h-5" />
          Gerenciar Logos no Storage
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <div className="relative">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              id="logo-upload"
            />
            <label htmlFor="logo-upload">
              <Button
                type="button"
                className="bg-[#efc349] hover:bg-[#efc349]/90 text-[#020817]"
                asChild
              >
                <span className="cursor-pointer">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Nova Logo
                </span>
              </Button>
            </label>
          </div>

          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-red-500/30 text-red-500 hover:bg-red-500/10">
                <Trash2 className="w-4 h-4 mr-2" />
                Remover Logo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Remover Logo do Storage</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Selecione a logo para remover:</Label>
                  <Select value={selectedLogoToDelete} onValueChange={setSelectedLogoToDelete}>
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha uma logo" />
                    </SelectTrigger>
                    <SelectContent>
                      {logos.map((logo) => (
                        <SelectItem key={logo.name} value={logo.name}>
                          {logo.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => setDeleteDialogOpen(false)} variant="outline" className="flex-1">
                    Cancelar
                  </Button>
                  <Button onClick={handleDelete} variant="destructive" className="flex-1" disabled={!selectedLogoToDelete}>
                    Remover
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Upload Dialog */}
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload de Nova Logo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="company-name">Nome da Empresa *</Label>
                <Input
                  id="company-name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Digite o nome da empresa"
                  required
                />
              </div>
              {selectedFile && (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Arquivo selecionado: {selectedFile.name}
                </div>
              )}
              <div className="flex gap-2">
                <Button onClick={() => setUploadDialogOpen(false)} variant="outline" className="flex-1">
                  Cancelar
                </Button>
                <Button onClick={handleUpload} disabled={uploading || !companyName.trim()} className="flex-1 bg-[#efc349] hover:bg-[#efc349]/90 text-[#020817]">
                  {uploading ? "Enviando..." : "Upload"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Lista de Logos */}
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#efc349] mx-auto"></div>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Carregando logos...</p>
          </div>
        ) : logos.length === 0 ? (
          <div className="text-center py-8">
            <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Nenhuma logo encontrada</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {logos.map((logo) => (
              <div key={logo.name} className="relative">
                <div className="aspect-square bg-white dark:bg-[#020817] border border-gray-200 dark:border-[#efc349]/30 rounded-lg p-2 flex items-center justify-center">
                  <img
                    src={logo.url}
                    alt={logo.name}
                    className="max-w-full max-h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 truncate" title={logo.name}>
                  {logo.name}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LogoUploadPanel;
