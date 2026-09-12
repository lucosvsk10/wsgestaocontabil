import { useState } from 'react';
import { ArrowRight, Clock3, FilePenLine, FileText, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { clearEmissionDraft, type ListedEmissionDraft } from '@/lib/saas/emissionDraft';
import SaasIssuedNotes from './SaasIssuedNotes';

const date = (value: string) => new Date(value).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
function DiscardDraft({ draft }: { draft: ListedEmissionDraft }) {
  const [error, setError] = useState('');
  return <><AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" className="ws-discard" aria-label={`Descartar rascunho de ${draft.documentType}`}><Trash2 size={15} /><span>Descartar</span></Button></AlertDialogTrigger>
    <AlertDialogContent className="ws-draft-confirm"><AlertDialogHeader><AlertDialogTitle>Descartar este rascunho?</AlertDialogTitle>
      <AlertDialogDescription>O preenchimento de {draft.documentType} será removido deste navegador. Nenhuma nota emitida será alterada.</AlertDialogDescription></AlertDialogHeader>
      <AlertDialogFooter><AlertDialogCancel>Manter rascunho</AlertDialogCancel><AlertDialogAction onClick={() => {
        try { clearEmissionDraft(draft.key); } catch { setError('Não foi possível descartar. Tente novamente.'); }
      }}>Descartar rascunho</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
  </AlertDialog>{error && <span role="alert">{error}</span>}</>;
}

export function DraftResumeBanner({ drafts, onResume, onAll }: { drafts: ListedEmissionDraft[]; onResume: (document: string) => void; onAll: () => void }) {
  const draft = drafts[0];
  if (!draft) return null;
  return <aside className="ws-draft-banner" aria-label="Nota em andamento">
    <div className="ws-draft-banner-icon"><FilePenLine size={21} /></div>
    <div className="ws-draft-banner-copy"><strong>Sua {draft.documentType} está onde você parou.</strong>
      <span>{draft.summary?.recipient || draft.summary?.subject || 'Rascunho salvo'} · {date(draft.savedAt)}</span></div>
    <Button className="ws-primary" onClick={() => onResume(draft.documentType)}>Continuar nota<ArrowRight size={15} /></Button>
    {drafts.length > 1 && <Button variant="ghost" onClick={onAll}>Ver {drafts.length} rascunhos</Button>}
    <DiscardDraft draft={draft} />
  </aside>;
}

export default function SaasMyNotes({ emissions, drafts, onNew, onResume, onReuse, initialTab = 'issued' }: {
  emissions: Parameters<typeof SaasIssuedNotes>[0]['emissions']; drafts: ListedEmissionDraft[];
  onNew: () => void; onResume: (document: string) => void; onReuse: Parameters<typeof SaasIssuedNotes>[0]['onReuse']; initialTab?: 'issued' | 'drafts';
}) {
  const [tab, setTab] = useState(initialTab);
  return <div className="ws-my-notes">
    <header className="ws-notes-heading"><div><p className="ws-eyebrow">DOCUMENTOS FISCAIS</p><h1>Minhas notas</h1><p>Da primeira linha preenchida à nota autorizada.</p></div>
      <Button className="ws-primary" onClick={onNew}><Plus size={17} />Nova nota</Button></header>
    <div className="ws-notes-tabs" role="tablist" aria-label="Minhas notas">
      <button type="button" role="tab" aria-selected={tab === 'issued'} aria-controls="ws-issued-panel" id="ws-issued-tab" onClick={() => setTab('issued')}><FileText size={17} />Emitidas<span>{emissions.length}</span></button>
      <button type="button" role="tab" aria-selected={tab === 'drafts'} aria-controls="ws-drafts-panel" id="ws-drafts-tab" onClick={() => setTab('drafts')}><FilePenLine size={17} />Rascunhos<span>{drafts.length}</span></button>
    </div>
    {tab === 'issued' ? <section id="ws-issued-panel" role="tabpanel" aria-labelledby="ws-issued-tab"><SaasIssuedNotes emissions={emissions} onNew={onNew} onReuse={onReuse} embedded /></section> :
      <section id="ws-drafts-panel" role="tabpanel" aria-labelledby="ws-drafts-tab">
        <div className="ws-drafts-intro"><p>Continue de onde parou</p><span>Salvos neste navegador · um rascunho em andamento por tipo de nota</span></div>
        {drafts.length ? <div className="ws-drafts-list">{drafts.map(draft => <article className="ws-draft-row" key={draft.key}>
          <div className="ws-draft-document"><FilePenLine size={25} strokeWidth={1.5} /><span>{draft.documentType}</span></div>
          <div className="ws-draft-row-main"><strong>{draft.summary?.recipient || draft.summary?.subject || `${draft.documentType} em preenchimento`}</strong>
            <p>{draft.summary?.subject || `Etapa: ${draft.tab || 'Preenchimento'}`}</p>
            <small><Clock3 size={13} />{date(draft.savedAt)} · {draft.summary?.environment === 'production' ? 'Produção' : 'Homologação'}</small></div>
          <div className="ws-draft-row-total"><span>Valor preenchido</span><strong>{Number(draft.summary?.total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></div>
          <div className="ws-draft-row-actions"><Button className="ws-primary" onClick={() => onResume(draft.documentType)}>Editar e continuar<ArrowRight size={15} /></Button><DiscardDraft draft={draft} /></div>
        </article>)}</div> : <div className="ws-notes-empty"><FilePenLine size={36} strokeWidth={1.2} /><h2>Nenhuma nota pela metade.</h2><p>Quando você começar uma emissão, o preenchimento aparecerá aqui para continuar depois.</p><Button variant="outline" onClick={onNew}>Começar uma nota</Button></div>}
      </section>}
  </div>;
}

