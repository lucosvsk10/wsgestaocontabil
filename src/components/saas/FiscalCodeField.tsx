import {useId,useMemo,useRef,useState} from 'react';
import {Search,ArrowRight} from 'lucide-react';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogDescription,DialogTitle} from '@/components/ui/dialog';
import {searchFiscalRecords} from './FiscalRecordPicker';
import '@/styles/fiscal-studio.css';

type Code = {code:string;description:string};
type Kind = 'ncm'|'service';
const cache:Partial<Record<Kind,Code[]>>={};
const requests:Partial<Record<Kind,Promise<Code[]>>>={};
// Service source: Portal Nacional NFS-e, Anexo B v1.01, 22/01/2026.
// NCM: BrasilAPI live table; no customer or company data is sent to this service.
async function loadCodes(kind:Kind):Promise<Code[]>{
 if(cache[kind])return cache[kind]!;
 if(requests[kind])return requests[kind]!;
 requests[kind]=(async()=>{
  let rows:Code[];
  if(kind==='service') rows=(await import('@/lib/saas/nationalServiceCodes.json')).default;
  else {
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
export default function FiscalCodeField({kind,label,value,onChange,required=false}:{kind:Kind;label:string;value:string;onChange:(code:string)=>void;required?:boolean}){
 const id=useId(),input=useRef<HTMLInputElement>(null);
 const [open,setOpen]=useState(false),[query,setQuery]=useState(''),[rows,setRows]=useState<Code[]>(cache[kind]||[]),[loading,setLoading]=useState(false),[failed,setFailed]=useState(false),[limit,setLimit]=useState(8);
 const fetchCodes=async()=>{setLoading(true);setFailed(false);try{setRows(await loadCodes(kind))}catch{setFailed(true)}finally{setLoading(false)}};
 const matches=useMemo(()=>searchFiscalRecords(rows.map(row=>({id:row.code,code:row.code,name:row.description})),query),[rows,query]);
 const exact=rows.find(row=>row.code===value);
 const show=()=>{setQuery(value||'');setLimit(8);setOpen(true);void fetchCodes()};
 return <div className="fe-code-field">
  <label htmlFor={id} className="fe-label">{label}{required&&<b aria-hidden="true"> *</b>}</label>
  <div className="fe-code-input"><Input id={id} inputMode="numeric" value={value||''} maxLength={kind==='ncm'?10:8}
    placeholder={kind==='ncm'?'8 dígitos':'6 dígitos'} onFocus={()=>{if(!rows.length&&!loading&&!failed)void fetchCodes()}} onChange={event=>onChange(event.target.value.replace(/\D/g,'').slice(0,kind==='ncm'?8:6))}/>
   <Button type="button" variant="ghost" aria-label={`Consultar ${label}`} onClick={show}><Search size={16}/><span>Consultar</span></Button></div>
  <small className="fe-field-hint">{exact?.description|| (kind==='ncm'?'Pesquise na tabela NCM pelo código ou descrição. Não é o código interno / SKU.':'Pesquise a classificação nacional pelo código ou nome do serviço. Não é o CNAE.')}</small>
  <Dialog open={open} onOpenChange={setOpen}><DialogContent className="ws-record-dialog" onOpenAutoFocus={event=>{event.preventDefault();input.current?.focus()}}>
   <header><p className="ws-eyebrow">CLASSIFICAÇÃO FISCAL</p><DialogTitle>{kind==='ncm'?'Encontrar um NCM':'Código nacional do serviço'}</DialogTitle><DialogDescription>Escolha o código que corresponde à operação. O texto da sua nota não será alterado.</DialogDescription></header>
   <div className="ws-record-search"><Search size={20}/><Input ref={input} aria-label="Buscar classificação fiscal" placeholder="Código ou palavras da descrição" value={query} onChange={e=>{setQuery(e.target.value);setLimit(8)}}/></div>
   <div className="ws-record-result-count" role="status">{loading?'Consultando tabela…':failed?'A tabela está indisponível. Você pode informar o código manualmente.':`${matches.length} classificações encontradas`}</div>
   <div className="ws-record-results">{!loading&&!failed&&matches.slice(0,limit).map(row=><button type="button" className="ws-record-result" key={row.id} onClick={()=>{onChange(row.id);setOpen(false)}}><span className="fe-code-number">{row.code}</span><span className="ws-record-body"><strong>{row.name}</strong></span><ArrowRight size={16}/></button>)}
    {!loading&&!failed&&!matches.length&&<div className="ws-record-empty">Nenhum resultado. Tente uma palavra mais curta ou o início do código.</div>}
    {!loading&&matches.length>limit&&<Button variant="ghost" className="ws-record-more" onClick={()=>setLimit(n=>n+8)}>Mostrar mais classificações</Button>}
    {failed&&<Button variant="outline" onClick={()=>void fetchCodes()}>Tentar novamente</Button>}
   </div><footer><span>{kind==='ncm'?'Tabela NCM · consulta BrasilAPI':'Portal Nacional NFS-e · Anexo B · versão 22/01/2026'}</span><Button variant="outline" onClick={()=>setOpen(false)}>Fechar</Button></footer>
  </DialogContent></Dialog>
 </div>
}
