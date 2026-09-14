import {useEffect,useId,useMemo,useRef,useState} from 'react';
import {Search,ArrowRight} from 'lucide-react';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogDescription,DialogTitle} from '@/components/ui/dialog';
import {searchFiscalRecords} from './FiscalRecordPicker';
import '@/styles/fiscal-studio.css';

type Code = {code:string;description:string};
type Kind = 'ncm'|'service'|'nbs'|'indop';
const cache:Partial<Record<Kind,Code[]>>={};
const requests:Partial<Record<Kind,Promise<Code[]>>>={};
const NBS_SOURCE='https://raw.githubusercontent.com/OCA/l10n-brazil/77e66cd5afdb885a8a293133b6a96fb9210e554f/l10n_br_fiscal/data/l10n_br_fiscal.nbs.csv';
const digits=(value:any)=>String(value??'').replace(/\D/g,'');
const formatNbs=(value:any)=>{const d=digits(value).slice(0,9);return d.length===9?`${d.slice(0,1)}.${d.slice(1,5)}.${d.slice(5,7)}.${d.slice(7,9)}`:d};
const parseCsvLine=(line:string)=>{const cells:string[]=[];let cell='',quoted=false;for(let i=0;i<line.length;i++){const ch=line[i];if(ch==='"'){if(quoted&&line[i+1]==='"'){cell+='"';i++}else quoted=!quoted}else if(ch===','&&!quoted){cells.push(cell);cell=''}else cell+=ch}cells.push(cell);return cells};
// Service source: Portal Nacional NFS-e, Anexo B v1.01, 22/01/2026.
// cIndOp source: tabela local versionada a partir do Anexo de Indicadores vigente no Portal Nacional.
// NBS source: NBS 2.0 mirrored in OCA/l10n-brazil. Only the public classification table is requested.
// NCM: BrasilAPI live table; no customer or company data is sent to these services.
async function loadCodes(kind:Kind):Promise<Code[]>{
 if(cache[kind])return cache[kind]!;
 if(requests[kind])return requests[kind]!;
 requests[kind]=(async()=>{
  let rows:Code[];
  if(kind==='service') rows=(await import('@/lib/saas/nationalServiceCodes.json')).default;
  else if(kind==='indop') rows=(await import('@/lib/saas/operationIndicatorCodes.json')).default;
  else if(kind==='nbs'){
   const response=await fetch(NBS_SOURCE,{signal:AbortSignal.timeout(12000)});
   if(!response.ok)throw new Error('Consulta NBS indisponível');
   const text=await response.text();
   rows=text.split(/\r?\n/).slice(1).map(parseCsvLine).filter(cells=>cells.length>=3&&digits(cells[1]).length===9)
    .map(cells=>({code:digits(cells[1]),description:String(cells[2]||'').trim()})).filter(row=>row.description);
  } else {
   const response=await fetch('https://brasilapi.com.br/api/ncm/v1',{signal:AbortSignal.timeout(12000)});
   if(!response.ok)throw new Error('Consulta indisponível');
   const data=await response.json();
   if(!Array.isArray(data))throw new Error('Resposta inválida');
   const today=new Date().toISOString().slice(0,10);
   rows=data.filter(row=>String(row.codigo).replace(/\D/g,'').length===8&&(!row.data_inicio||row.data_inicio<=today)&&(!row.data_fim||row.data_fim>=today))
    .map(row=>({code:String(row.codigo).replace(/\D/g,''),description:String(row.descricao)}));
  }
  cache[kind]=rows;return rows;
 })().finally(()=>{delete requests[kind]});
 return requests[kind]!;
}
export default function FiscalCodeField({kind,label,value,onChange,required=false,onResolved}:{kind:Kind;label:string;value:string;onChange:(code:string)=>void;required?:boolean;onResolved?:(record:Code)=>void}){
 const id=useId(),input=useRef<HTMLInputElement>(null),lastResolved=useRef('');
 const [open,setOpen]=useState(false),[query,setQuery]=useState(''),[rows,setRows]=useState<Code[]>(cache[kind]||[]),[loading,setLoading]=useState(false),[failed,setFailed]=useState(false),[limit,setLimit]=useState(8);
 const fetchCodes=async()=>{setLoading(true);setFailed(false);try{setRows(await loadCodes(kind))}catch{setFailed(true)}finally{setLoading(false)}};
 const matches=useMemo(()=>searchFiscalRecords(rows.map(row=>({id:row.code,code:kind==='nbs'?formatNbs(row.code):row.code,name:row.description})),query),[rows,query,kind]);
 const exact=rows.find(row=>digits(row.code)===digits(value));
 useEffect(()=>{if(!exact||!onResolved||lastResolved.current===exact.code)return;lastResolved.current=exact.code;onResolved(exact)},[exact?.code,onResolved]);
 const choose=(code:string)=>{const record=rows.find(row=>row.code===code);onChange(code);if(record&&onResolved){lastResolved.current=record.code;onResolved(record)}};
 const show=()=>{setQuery(value||'');setLimit(8);setOpen(true);void fetchCodes()};
 const maxDigits=kind==='ncm'?8:kind==='nbs'?9:6;
 const placeholder=kind==='ncm'?'8 dígitos':kind==='nbs'?'Ex.: 1.1404.43.00':kind==='indop'?'Ex.: 100301':'6 dígitos';
 const title=kind==='ncm'?'Encontrar um NCM':kind==='nbs'?'Encontrar uma NBS':kind==='indop'?'Indicador da operação (cIndOp)':'Código de Tributação Nacional';
 const hint=kind==='ncm'?'Pesquise na tabela NCM pelo código ou descrição. Não é o código interno / SKU.':kind==='nbs'?'Pesquise a NBS 2.0 pelo código ou pelo nome do serviço.':kind==='indop'?'Pesquise o indicador da operação por código ou pela característica do fornecimento.':'Pesquise a classificação nacional pelo código ou nome do serviço. A descrição oficial será aproveitada no cadastro.';
 const source=kind==='ncm'?'Tabela NCM · consulta BrasilAPI':kind==='nbs'?'NBS 2.0 · tabela pública de classificação':kind==='indop'?'Portal Nacional NFS-e · indicadores da operação IBS/CBS':'Portal Nacional NFS-e · Anexo B · versão 22/01/2026';
 return <div className="fe-code-field">
  <label htmlFor={id} className="fe-label">{label}{required&&<b aria-hidden="true"> *</b>}</label>
  <div className="fe-code-input"><Input id={id} inputMode="numeric" value={kind==='nbs'?formatNbs(value):value||''} maxLength={kind==='nbs'?12:kind==='ncm'?10:8}
    placeholder={placeholder} onFocus={()=>{if(!rows.length&&!loading&&!failed)void fetchCodes()}} onChange={event=>{const code=digits(event.target.value).slice(0,maxDigits);lastResolved.current='';onChange(code)}}/>
   <Button type="button" variant="ghost" aria-label={`Consultar ${label}`} onClick={show}><Search size={16}/><span>Consultar</span></Button></div>
  <small className="fe-field-hint">{exact?.description||hint}</small>
  <Dialog open={open} onOpenChange={setOpen}><DialogContent className="ws-record-dialog" onOpenAutoFocus={event=>{event.preventDefault();input.current?.focus()}}>
   <header><p className="ws-eyebrow">CLASSIFICAÇÃO FISCAL</p><DialogTitle>{title}</DialogTitle><DialogDescription>{kind==='nbs'?'Escolha o código NBS correspondente ao serviço. Você pode pesquisar pelo código ou por palavras da descrição.':kind==='indop'?'Escolha o indicador correspondente ao local e à natureza da operação. A descrição fica vinculada à emissão.':'Escolha o código que corresponde à operação. No cadastro de serviços, a descrição oficial será preenchida automaticamente.'}</DialogDescription></header>
   <div className="ws-record-search"><Search size={20}/><Input ref={input} aria-label="Buscar classificação fiscal" placeholder="Código ou palavras da descrição" value={query} onChange={e=>{setQuery(e.target.value);setLimit(8)}}/></div>
   <div className="ws-record-result-count" role="status">{loading?'Consultando tabela…':failed?'A tabela está indisponível. Você pode informar o código manualmente.':`${matches.length} classificações encontradas`}</div>
   <div className="ws-record-results">{!loading&&!failed&&matches.slice(0,limit).map(row=><button type="button" className="ws-record-result" key={row.id} onClick={()=>{choose(row.id);setOpen(false)}}><span className="fe-code-number">{kind==='nbs'?formatNbs(row.code):row.code}</span><span className="ws-record-body"><strong>{row.name}</strong></span><ArrowRight size={16}/></button>)}
    {!loading&&!failed&&!matches.length&&<div className="ws-record-empty">Nenhum resultado. Tente uma palavra mais curta ou o início do código.</div>}
    {!loading&&matches.length>limit&&<Button variant="ghost" className="ws-record-more" onClick={()=>setLimit(n=>n+8)}>Mostrar mais classificações</Button>}
    {failed&&<Button variant="outline" onClick={()=>void fetchCodes()}>Tentar novamente</Button>}
   </div><footer><span>{source}</span><Button variant="outline" onClick={()=>setOpen(false)}>Fechar</Button></footer>
  </DialogContent></Dialog>
 </div>
}
