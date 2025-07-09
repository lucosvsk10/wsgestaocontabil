import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Search, Download, FileText, Eye } from "lucide-react";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

interface XMLFile {
  name: string;
  created_at: string;
  updated_at: string;
  size: number;
  content?: string;
}

export const FiscalManagementView = () => {
  const { toast } = useToast();
  const [xmlFiles, setXmlFiles] = useState<XMLFile[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<XMLFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedXML, setSelectedXML] = useState<XMLFile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchXMLFiles();
  }, []);

  useEffect(() => {
    if (!searchTerm) {
      setFilteredFiles(xmlFiles);
    } else {
      const filtered = xmlFiles.filter(file =>
        file.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredFiles(filtered);
    }
  }, [xmlFiles, searchTerm]);

  const fetchXMLFiles = async () => {
    setIsLoading(true);
    try {
      const { data: files, error } = await supabase.storage
        .from('xml-nfe')
        .list('', {
          limit: 1000,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (error) {
        console.error('Erro ao buscar arquivos XML:', error);
        toast({
          title: "Erro",
          description: "Erro ao carregar arquivos XML",
          variant: "destructive"
        });
        return;
      }

      const xmlFilesData: XMLFile[] = (files || [])
        .filter(file => file.name.toLowerCase().endsWith('.xml'))
        .map(file => ({
          name: file.name,
          created_at: file.created_at || '',
          updated_at: file.updated_at || '',
          size: file.metadata?.size || 0
        }));

      setXmlFiles(xmlFilesData);
    } catch (error) {
      console.error('Erro ao buscar arquivos XML:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar arquivos XML",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Data não disponível';
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const downloadFile = async (fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('xml-nfe')
        .download(fileName);

      if (error) {
        console.error('Erro ao baixar arquivo:', error);
        toast({
          title: "Erro",
          description: "Erro ao baixar arquivo",
          variant: "destructive"
        });
        return;
      }

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao baixar arquivo:', error);
      toast({
        title: "Erro",
        description: "Erro ao baixar arquivo",
        variant: "destructive"
      });
    }
  };

  const viewXML = async (file: XMLFile) => {
    try {
      const { data, error } = await supabase.storage
        .from('xml-nfe')
        .download(file.name);

      if (error) {
        console.error('Erro ao carregar arquivo:', error);
        toast({
          title: "Erro",
          description: "Erro ao carregar conteúdo do arquivo",
          variant: "destructive"
        });
        return;
      }

      const content = await data.text();
      setSelectedXML({ ...file, content });
      setIsModalOpen(true);
    } catch (error) {
      console.error('Erro ao visualizar arquivo:', error);
      toast({
        title: "Erro",
        description: "Erro ao visualizar arquivo",
        variant: "destructive"
      });
    }
  };

  const highlightXML = (xml: string) => {
    return xml
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/(&lt;\/?)([^&\s]+)/g, '$1<span class="text-blue-400">$2</span>')
      .replace(/(&lt;[^&>]+)(\s+)([^&=]+)(=)("[^"]*")/g, '$1$2<span class="text-green-400">$3</span><span class="text-yellow-400">$4</span><span class="text-orange-400">$5</span>');
  };

  return (
    <div className="min-h-screen bg-[#020817] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <Card className="bg-transparent border-[#efc349]/20">
          <CardHeader>
            <CardTitle className="text-[#efc349] text-center text-3xl font-extralight flex items-center justify-center gap-2">
              <FileText className="h-8 w-8" />
              GESTÃO FISCAL - ARQUIVOS XML NFe
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#efc349] h-4 w-4" />
              <Input
                placeholder="Buscar arquivos XML por nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-transparent border-[#efc349]/30 text-white placeholder:text-white/50 focus:border-[#efc349] font-extralight"
              />
            </div>
          </CardContent>
        </Card>

        {/* Loading */}
        {isLoading && (
          <div className="flex justify-center items-center h-32">
            <LoadingSpinner />
          </div>
        )}

        {/* Estatísticas */}
        {!isLoading && (
          <Card className="bg-transparent border-[#efc349]/20">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-extralight text-[#efc349] mb-2">
                {filteredFiles.length}
              </div>
              <div className="text-[#a3a3a3] text-sm">
                {searchTerm ? `Arquivo${filteredFiles.length !== 1 ? 's' : ''} encontrado${filteredFiles.length !== 1 ? 's' : ''}` : `Arquivo${filteredFiles.length !== 1 ? 's' : ''} XML no bucket`}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lista de Arquivos XML */}
        {!isLoading && filteredFiles.length === 0 ? (
          <Card className="bg-transparent border-[#efc349]/20">
            <CardContent className="p-12 text-center">
              <FileText className="h-16 w-16 text-[#efc349]/50 mx-auto mb-4" />
              <div className="text-white/70 text-lg font-extralight">
                {searchTerm ? 'Nenhum arquivo encontrado' : 'Nenhum XML encontrado'}
              </div>
              <div className="text-[#a3a3a3] text-sm mt-2">
                {searchTerm ? 'Tente ajustar os termos de busca' : 'O bucket está vazio ou não contém arquivos XML'}
              </div>
            </CardContent>
          </Card>
        ) : !isLoading && (
          <div className="space-y-3">
            {filteredFiles.map((file, index) => (
              <Card key={index} className="bg-transparent border-[#efc349]/20 hover:bg-[#efc349]/5 transition-colors duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="text-white font-extralight text-lg mb-1">
                        {file.name}
                      </div>
                      <div className="text-[#a3a3a3] text-sm flex gap-4">
                        <span>📅 {formatDate(file.created_at)}</span>
                        <span>📏 {formatFileSize(file.size)}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => viewXML(file)}
                        className="text-[#efc349] border-[#efc349]/30 hover:bg-[#efc349]/10 font-extralight"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Visualizar XML
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadFile(file.name)}
                        className="text-[#efc349] border-[#efc349]/30 hover:bg-[#efc349]/10 font-extralight"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        📥 Baixar XML
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Modal de Visualização XML */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-4xl h-[80vh] bg-[#020817] border-[#efc349]/30">
            <DialogHeader>
              <DialogTitle className="text-[#efc349] font-extralight text-xl">
                Visualização XML: {selectedXML?.name}
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-hidden">
              <div className="h-full overflow-auto bg-black/30 rounded-lg p-4 border border-[#efc349]/20">
                <pre className="text-sm text-white/90 font-mono leading-relaxed">
                  <code
                    dangerouslySetInnerHTML={{
                      __html: selectedXML?.content ? highlightXML(selectedXML.content) : ''
                    }}
                  />
                </pre>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => selectedXML && downloadFile(selectedXML.name)}
                className="text-[#efc349] border-[#efc349]/30 hover:bg-[#efc349]/10 font-extralight"
              >
                <Download className="h-4 w-4 mr-2" />
                📥 Baixar XML
              </Button>
              <Button
                variant="secondary"
                onClick={() => setIsModalOpen(false)}
                className="bg-[#efc349] text-[#020817] hover:bg-[#efc349]/90 font-extralight"
              >
                Fechar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};