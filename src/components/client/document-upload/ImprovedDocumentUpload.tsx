import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { Upload, FileUp, File, X, Calendar as CalendarIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface FileWithPreview extends File {
  preview?: string;
  id: string;
  name: string;
  documentName?: string;
  documentCategory?: string;
  documentObservations?: string;
  expirationDate?: Date | null;
}

interface ImprovedDocumentUploadProps {
  userId: string;
  userName: string;
  documentCategories: string[];
  multipleFiles?: boolean;
}

export const ImprovedDocumentUpload: React.FC<ImprovedDocumentUploadProps> = ({
  userId,
  userName,
  documentCategories,
  multipleFiles = false
}) => {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [globalCategory, setGlobalCategory] = useState(documentCategories[0] || 'Documentações');
  const [globalObservations, setGlobalObservations] = useState('');
  const [noExpiration, setNoExpiration] = useState(false);
  const [globalExpirationDate, setGlobalExpirationDate] = useState<Date | null>(null);
  const [useGlobalSettings, setUseGlobalSettings] = useState(true);
  const { toast } = useToast();
  
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => 
      Object.assign(file, {
        preview: URL.createObjectURL(file),
        id: crypto.randomUUID(),
        documentName: file.name.split('.')[0],
        documentCategory: globalCategory,
        documentObservations: globalObservations,
        expirationDate: noExpiration ? null : globalExpirationDate,
      })
    ) as FileWithPreview[];
    
    setFiles(prev => [...prev, ...newFiles]);
  }, [globalCategory, globalObservations, globalExpirationDate, noExpiration]);
  
  const removeFile = (id: string) => {
    setFiles(files => {
      const filteredFiles = files.filter(file => file.id !== id);
      return filteredFiles;
    });
  };
  
  const updateFileField = (id: string, field: 'documentName' | 'documentCategory' | 'documentObservations', value: string) => {
    setFiles(files => files.map(file => 
      file.id === id 
        ? { ...file, [field]: value } 
        : file
    ));
  };
  
  const updateFileExpirationDate = (id: string, date: Date | null) => {
    setFiles(files => files.map(file => 
      file.id === id 
        ? { ...file, expirationDate: date } 
        : file
    ));
  };
  
  const applyGlobalSettingsToAll = () => {
    setFiles(files => files.map(file => ({
      ...file,
      documentCategory: globalCategory,
      documentObservations: globalObservations,
      expirationDate: noExpiration ? null : globalExpirationDate,
    })));
  };

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onDrop(Array.from(e.target.files));
    }
  };

  // Handle file drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onDrop(Array.from(e.dataTransfer.files));
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast({
        title: "Nenhum arquivo selecionado",
        description: "Por favor, selecione pelo menos um arquivo para upload.",
        variant: "destructive",
      });
      return;
    }
    
    // Validate file names
    const filesWithoutNames = files.filter(file => !file.documentName);
    if (filesWithoutNames.length > 0) {
      toast({
        title: "Nome de documento faltando",
        description: "Por favor, forneça um nome para todos os documentos.",
        variant: "destructive",
      });
      return;
    }
    
    setIsUploading(true);
    
    try {
      // Upload files one by one
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const filePath = `${userId}/${fileName}`;
        
        // Upload file to storage
        const { error: storageError } = await supabase.storage
          .from('documents')
          .upload(filePath, file);
          
        if (storageError) throw storageError;
        
        // Get file URL
        const { data: urlData } = supabase.storage
          .from('documents')
          .getPublicUrl(filePath);
          
        if (!urlData?.publicUrl) {
          throw new Error('Erro ao obter URL pública do arquivo');
        }
        
        // Format the expiration date as ISO string if it exists
        const expirationDate = (file.expirationDate || (!noExpiration && globalExpirationDate)) 
          ? (file.expirationDate || globalExpirationDate)?.toISOString() 
          : null;
        
        // Insert document record
        const { error: dbError } = await supabase
          .from('documents')
          .insert({
            user_id: userId,
            name: file.documentName || file.name.split('.')[0],
            original_filename: file.name,
            filename: fileName,
            category: file.documentCategory || globalCategory,
            observations: file.documentObservations || globalObservations,
            expires_at: expirationDate,
            file_url: urlData.publicUrl,
            storage_key: filePath,
            size: file.size
          });
          
        if (dbError) throw dbError;
      }
      
      // Success toast
      toast({
        title: "Upload concluído com sucesso!",
        description: `${files.length} documento(s) foi/foram enviado(s) para ${userName}.`,
      });
      
      // Reset form
      setFiles([]);
      
    } catch (error: any) {
      console.error('Erro no upload:', error);
      toast({
        title: "Erro no upload",
        description: error.message || "Ocorreu um erro ao fazer upload dos documentos.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <Card className="border border-gray-200 dark:border-gold/20 bg-white dark:bg-navy-dark shadow-md">
        <CardHeader className="border-b border-gray-200 dark:border-gold/20 bg-gray-50 dark:bg-navy-deeper">
          <CardTitle className="text-navy dark:text-gold text-xl font-museo flex items-center">
            <Upload className="h-5 w-5 mr-2 text-navy dark:text-gold" />
            Enviando documentos para {userName}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="p-6">
          {/* Global settings for all files */}
          {multipleFiles && (
            <div className="mb-6 p-4 bg-gray-50 dark:bg-navy-light/10 rounded-lg border border-gray-200 dark:border-gold/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-navy dark:text-white">Configurações para todos os documentos</h3>
                <Checkbox 
                  id="useGlobalSettings" 
                  checked={useGlobalSettings} 
                  onCheckedChange={(checked) => setUseGlobalSettings(!!checked)} 
                  className="text-navy dark:text-gold data-[state=checked]:bg-navy dark:data-[state=checked]:bg-gold data-[state=checked]:text-white"
                />
              </div>
              
              {useGlobalSettings && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="globalCategory" className="text-navy dark:text-gold">Categoria</Label>
                    <Select 
                      value={globalCategory} 
                      onValueChange={setGlobalCategory}
                    >
                      <SelectTrigger className="bg-white dark:bg-navy/80 border-gray-300 dark:border-navy-lighter/50">
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {documentCategories.map(category => (
                          <SelectItem key={category} value={category}>{category}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="globalObservations" className="text-navy dark:text-gold">Observações</Label>
                    <Textarea 
                      id="globalObservations"
                      placeholder="Observações gerais para todos os documentos"
                      value={globalObservations}
                      onChange={(e) => setGlobalObservations(e.target.value)}
                      className="bg-white dark:bg-navy/80 border-gray-300 dark:border-navy-lighter/50"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="noExpiration" 
                        checked={noExpiration} 
                        onCheckedChange={(checked) => setNoExpiration(!!checked)} 
                        className="text-navy dark:text-gold data-[state=checked]:bg-navy dark:data-[state=checked]:bg-gold data-[state=checked]:text-white"
                      />
                      <Label htmlFor="noExpiration" className="text-sm text-navy dark:text-gold">
                        Sem data de expiração
                      </Label>
                    </div>
                    
                    {!noExpiration && (
                      <div>
                        <Label htmlFor="expirationDate" className="text-navy dark:text-gold">Data de expiração</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              id="expirationDate"
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal bg-white dark:bg-navy/80 border-gray-300 dark:border-navy-lighter/50",
                                !globalExpirationDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {globalExpirationDate ? format(globalExpirationDate, "PPP") : "Selecione uma data"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={globalExpirationDate || undefined}
                              onSelect={setGlobalExpirationDate}
                              initialFocus
                              disabled={(date) => date < new Date()}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    )}
                  </div>
                  
                  {files.length > 0 && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={applyGlobalSettingsToAll}
                      className="w-full mt-4 border-navy dark:border-gold text-navy dark:text-gold hover:bg-navy hover:text-white dark:hover:bg-gold"
                    >
                      Aplicar configurações a todos os documentos
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* Drop area */}
          <div 
            className="border-2 border-dashed border-gray-300 dark:border-gold/30 rounded-lg p-8 text-center hover:border-navy dark:hover:border-gold/50 transition-colors"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <FileUp className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
            
            <div className="mt-4">
              <h3 className="text-lg font-medium text-navy-dark dark:text-gold">
                {multipleFiles ? 'Arraste vários arquivos ou clique para fazer upload' : 'Arraste um arquivo ou clique para fazer upload'}
              </h3>
              
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Formatos suportados: PDF, DOCX, JPG, PNG
              </p>
              
              <div className="mt-4">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => document.getElementById('fileInput')?.click()}
                  className="bg-white dark:bg-navy-light/30 border-navy/20 dark:border-gold/20 text-navy dark:text-gold hover:bg-navy hover:text-white dark:hover:bg-gold dark:hover:text-navy"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Selecionar arquivo{multipleFiles ? 's' : ''}
                </Button>
                <input
                  id="fileInput"
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                  multiple={multipleFiles}
                />
              </div>
            </div>
          </div>
          
          {/* File list */}
          {files.length > 0 && (
            <div className="mt-6 space-y-4">
              <h3 className="font-medium text-navy dark:text-gold">Arquivos selecionados ({files.length})</h3>
              
              <div className="space-y-4">
                {files.map((file) => (
                  <Card key={file.id} className="border border-gray-200 dark:border-navy-lighter/30">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                          <File className="h-5 w-5 text-navy dark:text-gold mr-2" />
                          <span className="font-medium text-sm text-navy dark:text-white">{file.name}</span>
                        </div>
                        
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => removeFile(file.id)}
                          className="h-8 w-8 p-0 text-red-500 dark:text-red-400 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor={`name-${file.id}`} className="text-navy dark:text-gold">Nome do documento</Label>
                          <Input
                            id={`name-${file.id}`}
                            value={file.documentName || ''}
                            onChange={(e) => updateFileField(file.id, 'documentName', e.target.value)}
                            placeholder="Nome do documento"
                            className="bg-white dark:bg-navy/80 border-gray-300 dark:border-navy-lighter/50"
                            required
                          />
                        </div>
                        
                        {!useGlobalSettings && (
                          <>
                            <div>
                              <Label htmlFor={`category-${file.id}`} className="text-navy dark:text-gold">Categoria</Label>
                              <Select 
                                value={file.documentCategory || documentCategories[0]} 
                                onValueChange={(value) => updateFileField(file.id, 'documentCategory', value)}
                              >
                                <SelectTrigger className="bg-white dark:bg-navy/80 border-gray-300 dark:border-navy-lighter/50">
                                  <SelectValue placeholder="Selecione uma categoria" />
                                </SelectTrigger>
                                <SelectContent>
                                  {documentCategories.map(category => (
                                    <SelectItem key={category} value={category}>{category}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div>
                              <Label htmlFor={`observations-${file.id}`} className="text-navy dark:text-gold">Observações</Label>
                              <Textarea 
                                id={`observations-${file.id}`}
                                value={file.documentObservations || ''}
                                onChange={(e) => updateFileField(file.id, 'documentObservations', e.target.value)}
                                placeholder="Observações sobre este documento"
                                className="bg-white dark:bg-navy/80 border-gray-300 dark:border-navy-lighter/50"
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <Checkbox 
                                  id={`noExpiration-${file.id}`}
                                  checked={file.expirationDate === null}
                                  onCheckedChange={(checked) => updateFileExpirationDate(file.id, checked ? null : new Date())}
                                  className="text-navy dark:text-gold data-[state=checked]:bg-navy dark:data-[state=checked]:bg-gold data-[state=checked]:text-white"
                                />
                                <Label htmlFor={`noExpiration-${file.id}`} className="text-sm text-navy dark:text-gold">
                                  Sem data de expiração
                                </Label>
                              </div>
                              
                              {file.expirationDate !== null && (
                                <div>
                                  <Label htmlFor={`expiration-${file.id}`} className="text-navy dark:text-gold">Data de expiração</Label>
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button
                                        id={`expiration-${file.id}`}
                                        variant="outline"
                                        className={cn(
                                          "w-full justify-start text-left font-normal bg-white dark:bg-navy/80 border-gray-300 dark:border-navy-lighter/50",
                                          !file.expirationDate && "text-muted-foreground"
                                        )}
                                      >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {file.expirationDate ? format(file.expirationDate, "PPP") : "Selecione uma data"}
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                      <Calendar
                                        mode="single"
                                        selected={file.expirationDate || undefined}
                                        onSelect={(date) => updateFileExpirationDate(file.id, date)}
                                        initialFocus
                                        disabled={(date) => date < new Date()}
                                      />
                                    </PopoverContent>
                                  </Popover>
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
          
          {files.length > 0 && (
            <Button 
              type="button" 
              onClick={handleUpload} 
              className="w-full mt-6 bg-navy hover:bg-navy/90 dark:bg-gold dark:hover:bg-gold/90 text-white dark:text-navy font-medium"
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  {files.length > 1 ? `Enviar ${files.length} documentos` : 'Enviar documento'}
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
