import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Search, Eye, Download, FileText, Building2 } from 'lucide-react';
import { useXMLStorage, XMLFile } from '@/hooks/useXMLStorage';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

export const XMLViewer = () => {
  const { cnpjGroups, isLoading, searchTerm, setSearchTerm, downloadFile } = useXMLStorage();
  const [selectedXML, setSelectedXML] = useState<XMLFile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const formatDate = (dateString: string) => {
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

  const formatCNPJ = (cnpj: string) => {
    if (cnpj === 'CNPJ não identificado') return cnpj;
    if (cnpj.length === 14) {
      return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return cnpj;
  };

  const highlightXML = (xml: string) => {
    return xml
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/(&lt;\/?)([^&\s]+)/g, '$1<span class="text-blue-400">$2</span>')
      .replace(/(&lt;[^&>]+)(\s+)([^&=]+)(=)("[^"]*")/g, '$1$2<span class="text-green-400">$3</span><span class="text-yellow-400">$4</span><span class="text-orange-400">$5</span>');
  };

  const viewXML = (file: XMLFile) => {
    setSelectedXML(file);
    setIsModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-deepNavy p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <Card className="bg-transparent border-gold/20">
          <CardHeader>
            <CardTitle className="text-gold text-center text-3xl font-extralight">
              GERENCIADOR DE ARQUIVOS XML NFe
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gold h-4 w-4" />
              <Input
                placeholder="Buscar por CNPJ, nome do emitente ou nome do arquivo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-transparent border-gold/30 text-white placeholder:text-white/50 focus:border-gold"
              />
            </div>
          </CardContent>
        </Card>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-transparent border-gold/20">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-extralight text-gold mb-2">
                {cnpjGroups.length}
              </div>
              <div className="text-white/70 text-sm">CNPJs Únicos</div>
            </CardContent>
          </Card>
          <Card className="bg-transparent border-gold/20">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-extralight text-gold mb-2">
                {cnpjGroups.reduce((total, group) => total + group.count, 0)}
              </div>
              <div className="text-white/70 text-sm">Arquivos XML</div>
            </CardContent>
          </Card>
          <Card className="bg-transparent border-gold/20">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-extralight text-gold mb-2">
                {cnpjGroups.filter(group => group.cnpj !== 'CNPJ não identificado').length}
              </div>
              <div className="text-white/70 text-sm">CNPJs Válidos</div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de grupos por CNPJ */}
        {cnpjGroups.length === 0 ? (
          <Card className="bg-transparent border-gold/20">
            <CardContent className="p-12 text-center">
              <FileText className="h-16 w-16 text-gold/50 mx-auto mb-4" />
              <div className="text-white/70 text-lg">Nenhum arquivo XML encontrado</div>
              <div className="text-white/50 text-sm mt-2">
                {searchTerm ? 'Tente ajustar os termos de busca' : 'Faça upload de arquivos XML para começar'}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Accordion type="multiple" className="space-y-4">
            {cnpjGroups.map((group, index) => (
              <AccordionItem
                key={group.cnpj}
                value={`item-${index}`}
                className="bg-transparent border border-gold/20 rounded-lg data-[state=open]:bg-gold/5"
              >
                <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-gold/5 transition-colors duration-300">
                  <div className="flex items-center gap-4 w-full">
                    <Building2 className="h-5 w-5 text-gold flex-shrink-0" />
                    <div className="flex-1 text-left">
                      <div className="text-gold font-extralight text-lg">
                        {formatCNPJ(group.cnpj)}
                      </div>
                      <div className="text-white/70 text-sm">
                        {group.emitenteName}
                      </div>
                    </div>
                    <div className="text-gold text-sm font-extralight">
                      {group.count} arquivo{group.count !== 1 ? 's' : ''}
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4">
                  <div className="space-y-3 mt-4">
                    {group.files.map((file, fileIndex) => (
                      <div
                        key={fileIndex}
                        className="flex items-center justify-between p-4 bg-transparent border border-gold/10 rounded-lg hover:bg-gold/5 transition-colors duration-300"
                      >
                        <div className="flex-1">
                          <div className="text-white font-extralight">
                            {file.name}
                          </div>
                          <div className="text-white/50 text-sm mt-1">
                            {formatDate(file.created_at)} • {formatFileSize(file.size)}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => viewXML(file)}
                            className="text-gold border-gold/30 hover:bg-gold/10"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Visualizar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadFile(file.name)}
                            className="text-gold border-gold/30 hover:bg-gold/10"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Baixar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}

        {/* Modal de visualização XML */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-4xl h-[80vh] bg-deepNavy border-gold/30">
            <DialogHeader>
              <DialogTitle className="text-gold font-extralight text-xl">
                Visualização XML: {selectedXML?.name}
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-hidden">
              <div className="h-full overflow-auto bg-black/30 rounded-lg p-4 border border-gold/20">
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
                className="text-gold border-gold/30 hover:bg-gold/10"
              >
                <Download className="h-4 w-4 mr-2" />
                Baixar XML
              </Button>
              <Button
                variant="secondary"
                onClick={() => setIsModalOpen(false)}
                className="bg-gold text-deepNavy hover:bg-gold/90"
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