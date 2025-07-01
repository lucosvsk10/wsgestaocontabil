import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { MessageSquare, HelpCircle, ExternalLink, Send, Shield, Upload, BarChart3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const FiscalFeedbackHelp = () => {
  const [feedback, setFeedback] = useState('');
  const [email, setEmail] = useState('');
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const handleSubmitFeedback = async () => {
    if (!feedback.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, digite seu feedback",
        variant: "destructive"
      });
      return;
    }

    // Simular envio de feedback
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast({
      title: "Feedback Enviado",
      description: "Obrigado pelo seu feedback! Entraremos em contato em breve."
    });
    
    setFeedback('');
    setEmail('');
    setOpen(false);
  };

  const faqItems = [
    {
      question: "Como faço upload do meu certificado digital?",
      answer: "Acesse a seção 'Certificados' no menu lateral e clique em 'Fazer Upload'. Selecione seu arquivo .pfx e digite a senha do certificado."
    },
    {
      question: "Quais são os benefícios da automação fiscal?",
      answer: "A automação fiscal permite consulta automática de notas fiscais, organização de documentos, relatórios gerenciais e facilita o trabalho do contador."
    },
    {
      question: "Como visualizar minhas notas fiscais?",
      answer: "Acesse 'Notas Fiscais' no menu para ver todas as suas notas. Use os filtros para buscar por período ou tipo específico."
    },
    {
      question: "Posso baixar meus documentos fiscais em lote?",
      answer: "Sim! Na listagem de notas fiscais, use os botões 'Baixar XMLs do Período' ou 'Baixar PDFs do Período' para download em lote."
    }
  ];

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {/* Feedback Button */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            size="sm"
            className="bg-gold hover:bg-gold/90 text-navy shadow-lg"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Feedback
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enviar Feedback</DialogTitle>
            <DialogDescription>
              Sua opinião é importante para melhorarmos o sistema fiscal
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Email (opcional)
              </label>
              <Input
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                Seu Feedback
              </label>
              <Textarea
                placeholder="Compartilhe suas sugestões, problemas ou elogios..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={4}
              />
            </div>
            <Button 
              onClick={handleSubmitFeedback}
              className="w-full bg-gold hover:bg-gold/90 text-navy"
            >
              <Send className="h-4 w-4 mr-2" />
              Enviar Feedback
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Help Button */}
      <Dialog>
        <DialogTrigger asChild>
          <Button
            size="sm"
            variant="outline"
            className="bg-white dark:bg-gray-800 shadow-lg"
          >
            <HelpCircle className="h-4 w-4 mr-2" />
            Ajuda
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Central de Ajuda - Sistema Fiscal</DialogTitle>
            <DialogDescription>
              Encontre respostas para as principais dúvidas sobre automação fiscal
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Quick Start Guide */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-blue-600" />
                  Guia de Início Rápido
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">1</div>
                  <div>
                    <p className="font-medium">Upload do Certificado Digital</p>
                    <p className="text-sm text-muted-foreground">Faça upload do seu certificado .pfx na seção "Certificados"</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">2</div>
                  <div>
                    <p className="font-medium">Consulta Automática</p>
                    <p className="text-sm text-muted-foreground">O sistema consulta automaticamente suas notas fiscais</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">3</div>
                  <div>
                    <p className="font-medium">Relatórios e Downloads</p>
                    <p className="text-sm text-muted-foreground">Acesse dashboards e baixe documentos organizados</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* FAQ */}
            <Card>
              <CardHeader>
                <CardTitle>Perguntas Frequentes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {faqItems.map((item, index) => (
                  <div key={index} className="border-b pb-3 last:border-b-0">
                    <p className="font-medium text-sm mb-2">{item.question}</p>
                    <p className="text-sm text-muted-foreground">{item.answer}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Features Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Funcionalidades Disponíveis</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <BarChart3 className="h-5 w-5 text-green-600 mt-1" />
                  <div>
                    <p className="font-medium text-sm">Dashboard Fiscal</p>
                    <p className="text-xs text-muted-foreground">Visualize métricas e tendências das suas notas fiscais</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Upload className="h-5 w-5 text-blue-600 mt-1" />
                  <div>
                    <p className="font-medium text-sm">Download em Lote</p>
                    <p className="text-xs text-muted-foreground">Baixe XMLs e PDFs organizados por período</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact */}
            <Card>
              <CardHeader>
                <CardTitle>Precisa de Mais Ajuda?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Nossa equipe está pronta para ajudar você
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => window.open('mailto:suporte@wsgestao.com.br?subject=Dúvida sobre Sistema Fiscal', '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Entrar em Contato
                </Button>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};