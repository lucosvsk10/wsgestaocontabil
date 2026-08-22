import { useEffect, useState } from "react";
import { WRONG_COMPETENCE_IMPORT_EVENT, WrongCompetenceImportCancelledError, WrongCompetenceImportRequest } from "@/lib/lancamentos/workspaceStorage";
import { WrongCompetenceImportDialog } from "./WrongCompetenceImportDialog";

export function WrongCompetenceImportGuard() {
  const [request, setRequest] = useState<WrongCompetenceImportRequest | null>(null);

  useEffect(() => {
    const handleRequest = (event: Event) => {
      const custom = event as CustomEvent<WrongCompetenceImportRequest>;
      if (!custom.detail) return;
      setRequest(custom.detail);
    };
    const handleUnhandled = (event: PromiseRejectionEvent) => {
      if (event.reason instanceof WrongCompetenceImportCancelledError || event.reason?.name === "WrongCompetenceImportCancelledError") {
        event.preventDefault();
      }
    };

    window.addEventListener(WRONG_COMPETENCE_IMPORT_EVENT, handleRequest as EventListener);
    window.addEventListener("unhandledrejection", handleUnhandled);
    return () => {
      window.removeEventListener(WRONG_COMPETENCE_IMPORT_EVENT, handleRequest as EventListener);
      window.removeEventListener("unhandledrejection", handleUnhandled);
    };
  }, []);

  const decide = (keep: boolean) => {
    const current = request;
    if (!current) return;
    setRequest(null);
    current.resolve(keep);
  };

  return <WrongCompetenceImportDialog
    open={Boolean(request)}
    currentCompetence={request?.currentCompetence ?? ""}
    detectedCompetence={request?.detectedCompetence ?? ""}
    fileNames={request?.fileNames ?? []}
    onKeep={() => decide(true)}
    onRemove={() => decide(false)}
  />;
}
