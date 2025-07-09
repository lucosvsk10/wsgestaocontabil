import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface XMLFile {
  name: string;
  created_at: string;
  updated_at: string;
  size: number;
  cnpj?: string;
  emitenteName?: string;
  content?: string;
}

export interface CNPJGroup {
  cnpj: string;
  emitenteName: string;
  files: XMLFile[];
  count: number;
}

export const useXMLStorage = () => {
  const [xmlFiles, setXmlFiles] = useState<XMLFile[]>([]);
  const [cnpjGroups, setCnpjGroups] = useState<CNPJGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const parseXMLContent = (xmlContent: string): { cnpj?: string; emitenteName?: string } => {
    try {
      // Extrair CNPJ do emitente
      const cnpjMatch = xmlContent.match(/<emit>[\s\S]*?<CNPJ>(\d+)<\/CNPJ>/);
      const cnpj = cnpjMatch ? cnpjMatch[1] : undefined;

      // Extrair nome do emitente
      const nameMatch = xmlContent.match(/<emit>[\s\S]*?<xNome>(.*?)<\/xNome>/);
      const emitenteName = nameMatch ? nameMatch[1] : undefined;

      return { cnpj, emitenteName };
    } catch (error) {
      console.error('Erro ao fazer parse do XML:', error);
      return {};
    }
  };

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
        return;
      }

      const xmlFilesWithMetadata: XMLFile[] = [];

      for (const file of files || []) {
        if (file.name.toLowerCase().endsWith('.xml')) {
          try {
            // Baixar conteúdo do arquivo para extrair metadados
            const { data: fileData } = await supabase.storage
              .from('xml-nfe')
              .download(file.name);

            if (fileData) {
              const content = await fileData.text();
              const { cnpj, emitenteName } = parseXMLContent(content);

              xmlFilesWithMetadata.push({
                name: file.name,
                created_at: file.created_at || '',
                updated_at: file.updated_at || '',
                size: file.metadata?.size || 0,
                cnpj,
                emitenteName,
                content
              });
            }
          } catch (error) {
            console.error(`Erro ao processar arquivo ${file.name}:`, error);
            // Adicionar arquivo mesmo sem metadados
            xmlFilesWithMetadata.push({
              name: file.name,
              created_at: file.created_at || '',
              updated_at: file.updated_at || '',
              size: file.metadata?.size || 0
            });
          }
        }
      }

      setXmlFiles(xmlFilesWithMetadata);
      groupFilesByCNPJ(xmlFilesWithMetadata);
    } catch (error) {
      console.error('Erro ao buscar arquivos XML:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const groupFilesByCNPJ = (files: XMLFile[]) => {
    const groups = new Map<string, CNPJGroup>();

    files.forEach(file => {
      const cnpj = file.cnpj || 'CNPJ não identificado';
      const emitenteName = file.emitenteName || 'Nome não identificado';

      if (!groups.has(cnpj)) {
        groups.set(cnpj, {
          cnpj,
          emitenteName,
          files: [],
          count: 0
        });
      }

      const group = groups.get(cnpj)!;
      group.files.push(file);
      group.count = group.files.length;
    });

    setCnpjGroups(Array.from(groups.values()).sort((a, b) => b.count - a.count));
  };

  const getFilteredGroups = () => {
    if (!searchTerm) return cnpjGroups;

    return cnpjGroups.filter(group => 
      group.cnpj.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.emitenteName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.files.some(file => file.name.toLowerCase().includes(searchTerm.toLowerCase()))
    ).map(group => ({
      ...group,
      files: group.files.filter(file => 
        file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.cnpj.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.emitenteName.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }));
  };

  const downloadFile = async (fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('xml-nfe')
        .download(fileName);

      if (error) {
        console.error('Erro ao baixar arquivo:', error);
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
    }
  };

  useEffect(() => {
    fetchXMLFiles();
  }, []);

  return {
    xmlFiles,
    cnpjGroups: getFilteredGroups(),
    isLoading,
    searchTerm,
    setSearchTerm,
    fetchXMLFiles,
    downloadFile
  };
};