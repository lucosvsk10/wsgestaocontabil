import { useDeferredValue, useMemo, useState } from 'react';
import { ArrowRight, Check, MapPin, Plus, Search, UserRound, Package2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export type FiscalRecord = {
  id: string; name: string; identifier?: string; code?: string; classification?: string;
  location?: string; contact?: string; detail?: string; amount?: number; unit?: string;
};
const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export function searchFiscalRecords(items: FiscalRecord[], query: string) {
  const terms = normalize(query.trim()).split(/\s+/).filter(Boolean);
  return items.filter(item => {
    const search = normalize([item.name, item.code, item.identifier, item.classification, item.location, item.contact, item.detail].filter(Boolean).join(' '));
    const compact = search.replace(/[^a-z0-9]/g, '');
    return terms.every(term => search.includes(term) || compact.includes(term.replace(/[^a-z0-9]/g, '')));
  });
}
const currency = (amount: number) => amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function FiscalRecordPicker({ label, value, items, kind = 'person', required = false, onChange, onCreate }: {
  label: string; value: string; items: FiscalRecord[]; kind?: 'person' | 'product' | 'service'; required?: boolean;
  onChange: (id: string) => void; onCreate?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(8);
  const deferredQuery = useDeferredValue(query);
  const results = useMemo(() => searchFiscalRecords(items, deferredQuery), [items, deferredQuery]);
  const selected = items.find(item => item.id === value);
  const Icon = kind === 'person' ? UserRound : Package2;
  const placeholder = kind === 'person' ? 'Nome, CPF/CNPJ, cidade ou contato' : 'Nome, código do cadastro ou classificação fiscal';
  return <div className="ws-record-picker">
    <span className="ca-label">{label}{required && <b aria-hidden="true"> *</b>}</span>
    <Dialog open={open} onOpenChange={value => { setOpen(value); if (value) { setQuery(''); setLimit(8); } }}>
      <DialogTrigger asChild>
        <button type="button" className={`ws-record-trigger ${selected ? 'has-record' : ''}`} aria-label={`${selected ? 'Alterar' : 'Escolher'} ${label.toLowerCase()}`}>
          <span className="ws-record-avatar"><Icon size={22} strokeWidth={1.5} /></span>
          <span className="ws-record-body"><strong>{selected?.name || `Encontrar ${label.toLowerCase()}`}</strong>
            <small>{selected ? [selected.identifier, selected.code && `Código ${selected.code}`, selected.classification].filter(Boolean).join(' · ') : placeholder}</small>
            {selected?.location && <small className="ws-record-location">{selected.location}</small>}
            {selected?.contact && <small>{selected.contact}</small>}
          </span>
          <span className="ws-record-action">{selected ? 'Alterar' : <Search size={19} />}</span>
        </button>
      </DialogTrigger>
      <DialogContent className="ws-record-dialog" onOpenAutoFocus={event => {
        event.preventDefault(); requestAnimationFrame(() => document.getElementById(`record-search-${kind}`)?.focus());
      }}>
        <header><p className="ws-eyebrow">SEU CADASTRO</p><DialogTitle>Escolher {label.toLowerCase()}</DialogTitle>
          <DialogDescription>Encontre o registro e confira os dados antes de selecionar.</DialogDescription></header>
        <div className="ws-record-search"><Search size={21} /><Input id={`record-search-${kind}`} aria-label={`Buscar ${label.toLowerCase()}`} placeholder={placeholder}
          value={query} onChange={event => { setQuery(event.target.value); setLimit(8); }} /></div>
        <div className="ws-record-result-count" role="status">{results.length} {results.length === 1 ? 'registro encontrado' : 'registros encontrados'}</div>
        <div className="ws-record-results">
          {results.slice(0, limit).map(item => <button type="button" key={item.id} className="ws-record-result" onClick={() => { onChange(item.id); setOpen(false); }}>
            <span className="ws-record-avatar">{kind === 'person' ? item.name.split(' ').filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() : <Icon size={20} />}</span>
            <span className="ws-record-body"><strong>{item.name}</strong>
              <small>{[item.identifier, item.code && `Código ${item.code}`, item.classification].filter(Boolean).join(' · ') || 'Identificação não informada'}</small>
              {item.location && <small className="ws-record-location"><MapPin size={12} />{item.location}</small>}
              {item.contact && <small>{item.contact}</small>}
            </span>
            <span className="ws-record-price">{typeof item.amount === 'number' && Number.isFinite(item.amount) ? <><strong>{currency(item.amount)}</strong><small>{item.unit || 'por unidade'}</small></> : null}
              {item.id === value ? <Check size={18} aria-label="Selecionado" /> : <ArrowRight size={17} />}</span>
          </button>)}
          {!results.length && <div className="ws-record-empty"><Search size={26} /><strong>{items.length ? 'Não encontramos esse registro' : 'Seu cadastro começa aqui'}</strong><p>{items.length ? 'Tente parte do nome, o documento ou o código, sem pontuação.' : 'Adicione o primeiro cadastro para reutilizar os dados nas próximas notas.'}</p></div>}
          {results.length > limit && <Button variant="ghost" className="ws-record-more" onClick={() => setLimit(current => current + 8)}>Mostrar mais registros</Button>}
        </div>
        <footer>{!required && value && <Button variant="ghost" onClick={() => { onChange(''); setOpen(false); }}>Remover seleção</Button>}
          {onCreate && <Button variant="outline" onClick={() => { setOpen(false); onCreate(); }}><Plus size={16} />Novo cadastro</Button>}
          <span>Os dados selecionados serão usados nesta nota.</span></footer>
      </DialogContent>
    </Dialog>
  </div>;
}

