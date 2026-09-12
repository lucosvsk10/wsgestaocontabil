import { useEffect, useId, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';

type Municipality = { code: string; name: string; state: string };
let municipalities: Municipality[] = [];
let pending: Promise<Municipality[]> | null = null;
const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

async function loadMunicipalities() {
  if (municipalities.length) return municipalities;
  if (!pending) pending = fetch('https://servicodados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome', { signal: AbortSignal.timeout(12000) })
    .then(async response => {
      if (!response.ok) throw new Error('IBGE indisponível');
      const rows = await response.json();
      if (!Array.isArray(rows)) throw new Error('Resposta inválida');
      municipalities = rows.map(row => ({
        code: String(row.id), name: String(row.nome),
        state: row.microrregiao?.mesorregiao?.UF?.sigla || row['regiao-imediata']?.['regiao-intermediaria']?.UF?.sigla || '',
      })).filter(row => /^\d{7}$/.test(row.code) && row.state.length === 2);
      return municipalities;
    }).finally(() => { pending = null; });
  return pending;
}

export default function MunicipalityField({ label, value, name = '', state = '', onChange }: {
  label: string; value: string; name?: string; state?: string; onChange: (value: Municipality) => void;
}) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState(name ? `${name}/${state}` : value);
  const [rows, setRows] = useState(municipalities);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { if (value) setQuery(name ? `${name}/${state}` : value); }, [value, name, state]);
  const search = async () => {
    setOpen(true);
    setLoading(true);
    try { const data = await loadMunicipalities(); if (mounted.current) { setRows(data); setFailed(false); } }
    catch { if (mounted.current) setFailed(true); }
    finally { if (mounted.current) setLoading(false); }
  };
  const filtered = query.trim().length < 2 ? [] : rows.filter(row =>
    normalize(`${row.name}/${row.state}`).includes(normalize(query.trim())) || row.code.startsWith(query.trim())
  ).slice(0, 8);
  const choose = (row: Municipality) => { onChange(row); setQuery(`${row.name}/${row.state}`); setOpen(false); };
  return <div ref={root} className="ca-municipality" onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false);
  }}>
    <label className="ca-label" htmlFor={id}>{label} <b aria-hidden="true">*</b></label>
    <Input id={id} value={query} onFocus={() => void search()} placeholder="Nome da cidade ou código IBGE"
      autoComplete="off" role="combobox" aria-expanded={open} aria-controls={`${id}-results`} aria-autocomplete="list"
      onKeyDown={event => { if (event.key === 'Escape') setOpen(false); if (event.key === 'Enter' && filtered.length === 1) { event.preventDefault(); choose(filtered[0]); } }}
      onChange={event => { setQuery(event.target.value); setOpen(true); onChange({ code: '', name: '', state: '' }); }} />
    {value && <small className="ca-field-hint">{name ? `${name}/${state} · ` : ''}IBGE {value}</small>}
    {open && <div id={`${id}-results`} className="ca-municipality-results" role="listbox" aria-label={`Resultados: ${label}`}>
      {loading ? <p role="status">Consultando municípios…</p> : filtered.map(row => <button type="button" role="option" aria-selected={row.code === value} key={row.code}
        onMouseDown={event => event.preventDefault()} onClick={() => choose(row)}><strong>{row.name}/{row.state}</strong><span>{row.code}</span></button>)}
      {!loading && !filtered.length && !failed && <p>{query.length < 2 ? 'Digite ao menos 2 letras ou o código IBGE.' : 'Nenhum município encontrado. Confira o nome ou código.'}</p>}
    </div>}
    {failed && <div className="ca-municipality-manual">
      <p className="ca-field-hint" role="status">A consulta ao IBGE está indisponível. Você pode informar os dados manualmente.</p>
      <Input aria-label={`${label}: código IBGE`} placeholder="Código IBGE" value={value} onChange={e => onChange({code:e.target.value.replace(/\D/g,'').slice(0,7),name,state})} />
      <Input aria-label={`${label}: nome`} placeholder="Cidade" value={name} onChange={e => onChange({code:value,name:e.target.value,state})} />
      <Input aria-label={`${label}: UF`} placeholder="UF" value={state} onChange={e => onChange({code:value,name,state:e.target.value.toUpperCase().slice(0,2)})} />
    </div>}
  </div>;
}

