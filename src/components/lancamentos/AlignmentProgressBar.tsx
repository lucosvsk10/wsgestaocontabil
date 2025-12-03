import { useState, useEffect, useCallback } from "react";
import { CheckCircle, XCircle, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface AlignmentProgressBarProps {
  documentId: string;
  processedAt: string;
  statusAlinhamento: string;
  tentativasAlinhamento?: number;
  ultimoErro?: string | null;
  onAlignmentComplete?: () => void;
}

const ALIGNMENT_DURATION_MS = 20 * 1000; // 20 seconds
const TRIGGER_AT_PERCENT = 80;
const MAX_RETRIES = 3;

export const AlignmentProgressBar = ({
  documentId,
  processedAt,
  statusAlinhamento,
  tentativasAlinhamento = 0,
  ultimoErro,
  onAlignmentComplete
}: AlignmentProgressBarProps) => {
  const [progress, setProgress] = useState(0);
  const [isTriggering, setIsTriggering] = useState(false);
  const [triggered, setTriggered] = useState(false);

  const triggerAlignment = useCallback(async () => {
    if (triggered || isTriggering || statusAlinhamento === 'alinhado') return;
    
    setIsTriggering(true);
    setTriggered(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      await fetch(`https://nadtoitgkukzbghtbohm.supabase.co/functions/v1/align-document`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ document_id: documentId })
      });
    } catch (error) {
      console.error('Error triggering alignment:', error);
      setTriggered(false);
    } finally {
      setIsTriggering(false);
    }
  }, [documentId, triggered, isTriggering, statusAlinhamento]);

  useEffect(() => {
    if (statusAlinhamento === 'alinhado' || statusAlinhamento === 'erro') {
      setProgress(100);
      return;
    }

    // Don't show progress for aguardando_retry
    if (statusAlinhamento === 'aguardando_retry') {
      return;
    }

    const processedTime = new Date(processedAt).getTime();
    
    const updateProgress = () => {
      const now = Date.now();
      const elapsed = now - processedTime;
      const newProgress = Math.min((elapsed / ALIGNMENT_DURATION_MS) * 100, 100);
      setProgress(newProgress);

      // Trigger alignment at 80%
      if (newProgress >= TRIGGER_AT_PERCENT && !triggered && statusAlinhamento === 'pendente') {
        triggerAlignment();
      }
    };

    updateProgress();
    const interval = setInterval(updateProgress, 500);

    return () => clearInterval(interval);
  }, [processedAt, statusAlinhamento, triggered, triggerAlignment]);

  if (statusAlinhamento === 'alinhado') {
    return (
      <div className="flex items-center gap-1.5">
        <CheckCircle className="w-3.5 h-3.5 text-blue-500" />
        <span className="text-xs text-blue-500">Alinhado</span>
      </div>
    );
  }

  if (statusAlinhamento === 'erro') {
    return (
      <div className="flex items-center gap-1.5">
        <XCircle className="w-3.5 h-3.5 text-destructive" />
        <span className="text-xs text-destructive">Erro após {MAX_RETRIES} tentativas</span>
      </div>
    );
  }

  if (statusAlinhamento === 'aguardando_retry') {
    return (
      <div className="flex items-center gap-1.5">
        <RefreshCw className="w-3.5 h-3.5 text-amber-500 animate-spin" />
        <span className="text-xs text-amber-500">
          Tentativa {tentativasAlinhamento}/{MAX_RETRIES} - Retry em 5min
        </span>
      </div>
    );
  }

  if (isTriggering || statusAlinhamento === 'processando') {
    return (
      <div className="flex items-center gap-1.5">
        <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />
        <span className="text-xs text-blue-500">
          Alinhando...{tentativasAlinhamento > 0 ? ` (tentativa ${tentativasAlinhamento}/${MAX_RETRIES})` : ''}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary/60 rounded-full transition-all duration-500 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="text-[10px] text-muted-foreground w-8">
        {Math.round(progress)}%
      </span>
    </div>
  );
};