import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Props {
  open: boolean;
  currentCompetence: string;
  detectedCompetence: string;
  fileNames: string[];
  keeping?: boolean;
  removing?: boolean;
  onKeep: () => void | Promise<void>;
  onRemove: () => void | Promise<void>;
}

export function WrongCompetenceImportDialog({ open, currentCompetence, detectedCompetence, fileNames, keeping = false, removing = false, onKeep, onRemove }: Props) {
  const busy = keeping || removing;
  return <Dialog open={open} onOpenChange={() => undefined}>
    <DialogContent className="max-w-lg border-border bg-background" onEscapeKeyDown={event => event.preventDefault()} onPointerDownOutside={event => event.preventDefault()}>
      <DialogHeader className="text-left">
        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-300">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <DialogTitle>Documento de outra competência</DialogTitle>
        <DialogDescription className="leading-6">
          Você estava editando <strong className="font-medium text-foreground">{currentCompetence}</strong>, mas o documento pertence a <strong className="font-medium text-foreground">{detectedCompetence}</strong>. Para evitar lançamento no mês errado, ele foi colocado automaticamente em {detectedCompetence}.
        </DialogDescription>
      </DialogHeader>

      <div className="rounded-md border border-border bg-muted/35 px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Importação detectada</p>
        <p className="mt-1 text-sm font-medium text-foreground">{detectedCompetence}</p>
        <p className="mt-2 truncate text-xs text-muted-foreground" title={fileNames.join(", ")}>{fileNames.length === 1 ? fileNames[0] : `${fileNames[0]} + ${fileNames.length - 1} arquivo(s)`}</p>
      </div>

      <p className="text-sm text-muted-foreground">Deseja manter essa importação em <strong className="font-medium text-foreground">{detectedCompetence}</strong>?</p>

      <DialogFooter className="gap-2 sm:gap-0">
        <Button variant="outline" disabled={busy} onClick={() => void onRemove()}>{removing ? "Excluindo..." : "Excluir importação"}</Button>
        <Button disabled={busy} onClick={() => void onKeep()}>{keeping ? "Processando..." : `Manter em ${detectedCompetence}`}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
