import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

type Company={id:string;name:string;tradeName:string;cnpj:string;uf?:string;certificateDays?:number|null};
type Props={companies:Company[];selectedCompanyId:string;onSelect:(id:string)=>void;preview?:boolean};

const digits=(v:unknown)=>String(v||'').replace(/\D/g,'');
const formatCnpj=(v:unknown)=>{const d=digits(v);return d.length===14?d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,'$1.$2.$3/$4-$5'):String(v||'Cadastro pendente')};
const initial=(v:string)=>String(v||'?').trim().charAt(0).toUpperCase()||'?';
const different=(legal:string,trade:string)=>trade&&trade.trim().toLocaleLowerCase('pt-BR')!==legal.trim().toLocaleLowerCase('pt-BR');

export default function ExtractorCompanySelector({companies,selectedCompanyId,onSelect}:Props){
 const [open,setOpen]=useState(false);const root=useRef<HTMLDivElement|null>(null);
 const selected=useMemo(()=>companies.find(c=>c.id===selectedCompanyId)||companies[0]||null,[companies,selectedCompanyId]);
 useEffect(()=>{if(!open)return;const close=(e:MouseEvent)=>{if(root.current&&!root.current.contains(e.target as Node))setOpen(false)};const key=(e:KeyboardEvent)=>e.key==='Escape'&&setOpen(false);document.addEventListener('mousedown',close);document.addEventListener('keydown',key);return()=>{document.removeEventListener('mousedown',close);document.removeEventListener('keydown',key)}},[open]);
 const choose=(id:string)=>{onSelect(id);setOpen(false)};
 return <div className="extractor-company-picker" ref={root}>
  <button className="extractor-company-picker-trigger" onClick={()=>setOpen(v=>!v)} aria-haspopup="listbox" aria-expanded={open}>
   <span className="extractor-company-picker-avatar">{initial(selected?.tradeName||selected?.name||'?')}</span>
   <span className="extractor-company-picker-copy">
    <strong>{selected?.name||'Selecione uma empresa'}</strong>
    {selected&&different(selected.name,selected.tradeName)&&<span>{selected.tradeName}</span>}
    <small>{selected?formatCnpj(selected.cnpj):'Adicione uma empresa com certificado A1'}</small>
   </span>
   {selected&&<i className={`extractor-company-picker-status ${selected.certificateDays==null?'missing':selected.certificateDays<0?'expired':selected.certificateDays<=30?'warning':'valid'}`} title={selected.certificateDays==null?'Sem A1':selected.certificateDays<0?'A1 vencido':selected.certificateDays<=30?'A1 próximo do vencimento':'A1 válido'}/>}
   <ChevronDown className={open?'is-open':''}/>
  </button>
  {open&&<div className="extractor-company-picker-menu" role="listbox">
   <p>Selecionar empresa</p>
   <div>
    {companies.length?companies.map(c=>{const active=c.id===selected?.id;return <button key={c.id} className={active?'is-active':''} onClick={()=>choose(c.id)} role="option" aria-selected={active}>
      <span className="extractor-company-picker-avatar small">{initial(c.tradeName||c.name)}</span>
      <span className="extractor-company-picker-copy"><strong>{c.name}</strong>{different(c.name,c.tradeName)&&<span>{c.tradeName}</span>}<small>{formatCnpj(c.cnpj)}{c.uf?` · ${c.uf}`:''}</small></span>
      <i className={`extractor-company-picker-status ${c.certificateDays==null?'missing':c.certificateDays<0?'expired':c.certificateDays<=30?'warning':'valid'}`}/>
      {active&&<b>Ativa</b>}
     </button>}):<span className="extractor-company-picker-empty">Nenhuma empresa adicionada ao Extrator.</span>}
   </div>
  </div>}
 </div>;
}
