import { useMemo } from "react";

const money=(v:any)=>Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const digits=(v:any)=>String(v??"").replace(/\D/g,"");
const doc=(v:any)=>{const d=digits(v);if(d.length===14)return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`;if(d.length===11)return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;return String(v||"—")};
const key=(v:any)=>String(v||"").replace(/\D/g,"").replace(/(.{4})/g,"$1 ").trim();
const statusLabel=(s:any)=>s==="authorized"?"AUTORIZADA":s==="rejected"?"REJEITADA":s==="cancelled"?"CANCELADA":s==="error"?"ERRO":s?String(s).toUpperCase():"PRÉVIA";

export function printDanfe(elementId:string,title="DANFE"){
 const node=document.getElementById(elementId); if(!node)return;
 const w=window.open("","_blank","width=1000,height=850"); if(!w)return;
 w.document.write(`<!doctype html><html><head><title>${title}</title><meta charset="utf-8"/><style>*{box-sizing:border-box}body{font-family:Arial,sans-serif;margin:0;padding:10mm;color:#000}.danfe-sheet{width:100%!important;max-width:none!important;border:0!important;box-shadow:none!important;background:#fff!important}.danfe-actions{display:none!important}.danfe-sheet *{color:#000!important}@page{size:A4 portrait;margin:8mm}</style></head><body>${node.outerHTML}</body></html>`);w.document.close();w.focus();setTimeout(()=>w.print(),250);
}

export default function SaasDanfePreview({id="danfe-preview",documentType="NF-e",environment="homologation",profile,data={},result=null,emission=null,showActions=false}:{id?:string;documentType?:string;environment?:string;profile?:any;data?:any;result?:any;emission?:any;showActions?:boolean}){
 const p=emission?.payload||data||{};
 const number=emission?.number||p.numeroNota||p.numero||p.nDPS||"—";
 const series=emission?.series||p.serie||"—";
 const access=emission?.access_key||result?.chaveAcesso||result?.chave||result?.response?.chMDFe||"";
 const protocol=emission?.protocol||result?.protocol||result?.response?.nProt||"";
 const status=emission?.status||(result?.authorized===true?"authorized":result?.authorized===false?"rejected":result?.error?"error":"preview");
 const rejection=emission?.response?.protocol?.xMotivo||emission?.response?.xMotivo||result?.response?.protocol?.xMotivo||result?.response?.xMotivo||result?.error||"";
 const total=Number(emission?.total??(p.quantidade&&p.valorUnitario?Number(p.quantidade)*Number(p.valorUnitario):p.valor??p.vTPrest??p.valorCarga??0));
 const emitName=p.nomeFantasia||p.razaoSocial||profile?.trade_name||profile?.legal_name||"Emitente";
 const emitLegal=p.razaoSocial||profile?.legal_name||emitName;
 const emitDoc=p.cnpjEmitente||profile?.tax_id||"";
 const recipient=emission?.recipient_name||p.destNome||p.tomadorNome||p.dest?.xNome||p.munDescargaNome||"Não informado";
 const recipientDoc=emission?.recipient_tax_id||p.destDocumento||p.tomadorDocumento||p.dest?.CNPJ||p.dest?.CPF||"";
 const item=p.produto||p.descricao||p.proPred||p.natOp||"Documento fiscal";
 const model=documentType==="NF-e"?"55":documentType==="NFC-e"?"65":documentType==="CT-e"?"57":documentType==="MDF-e"?"58":"NFS-e";
 const date=useMemo(()=>new Date(emission?.external_issue_date||emission?.authorized_at||emission?.created_at||Date.now()).toLocaleString("pt-BR"),[emission]);
 const imported=emission?.source==="imported";
 return <div className="space-y-3">
  {showActions&&<div className="danfe-actions flex flex-wrap gap-2"><button onClick={()=>printDanfe(id,`${documentType}-${number}`)} className="rounded-md border border-[#202833] bg-[#202833] px-4 py-2 text-xs font-semibold text-white">Imprimir / salvar PDF</button></div>}
  <div id={id} className="danfe-sheet mx-auto w-full max-w-[760px] border-2 border-black bg-white p-2 text-[10px] leading-tight text-black shadow-sm">
   {environment!=="production"&&<div className="mb-2 border-2 border-black bg-[#f1f1f1] px-2 py-1.5 text-center text-[11px] font-bold">SEM VALOR FISCAL — DOCUMENTO EMITIDO EM AMBIENTE DE HOMOLOGAÇÃO</div>}
   {status==="rejected"&&<div className="mb-2 border-2 border-black bg-[#ffe8e8] px-2 py-1.5"><b>DOCUMENTO REJEITADO</b>{rejection&&<span> — {rejection}</span>}</div>}
   {imported&&<div className="mb-2 border border-black bg-[#eaf2ff] px-2 py-1"><b>DOCUMENTO EXTRAÍDO</b> — importado da fonte fiscal da empresa.</div>}
   <div className="grid grid-cols-[1.45fr_.7fr_1.25fr] border-2 border-black">
    <div className="border-r-2 border-black p-2"><div className="text-[15px] font-bold">{emitName}</div><div className="mt-1">{emitLegal}</div><div className="mt-1">{[p.logradouro||profile?.street,p.numeroEndereco||profile?.street_number,p.bairro||profile?.district].filter(Boolean).join(", ")}</div><div>{[p.nomeMunicipio||profile?.city,profile?.state].filter(Boolean).join(" / ")}</div><div className="mt-1"><b>CNPJ:</b> {doc(emitDoc)} &nbsp; <b>IE:</b> {p.ie||profile?.state_registration||"—"}</div></div>
    <div className="flex flex-col items-center justify-center border-r-2 border-black p-2 text-center"><div className="text-[20px] font-black">DANFE</div><div className="mt-1 font-bold">Documento Auxiliar</div><div>{documentType}</div><div className="mt-2 border border-black px-2 py-1 text-[13px] font-bold">{model}</div></div>
    <div className="p-2"><div className="grid grid-cols-2 gap-2"><Box label="NÚMERO" value={number}/><Box label="SÉRIE" value={series}/></div><div className="mt-2"><Box label="DATA / HORA" value={date}/></div><div className="mt-2"><Box label="STATUS" value={statusLabel(status)}/></div></div>
   </div>
   <div className="mt-1 border-2 border-black p-2"><div className="text-[8px] font-bold">CHAVE DE ACESSO</div><div className="mt-1 break-all text-center text-[12px] font-bold tracking-[.12em]">{access?key(access):"CHAVE DISPONÍVEL APÓS GERAÇÃO / AUTORIZAÇÃO"}</div>{protocol&&<div className="mt-1 text-center"><b>Protocolo de autorização:</b> {protocol}</div>}</div>
   <div className="mt-1 border-2 border-black"><SectionTitle>DESTINATÁRIO / REMETENTE / TOMADOR</SectionTitle><div className="grid grid-cols-[1.6fr_.8fr_.8fr] divide-x divide-black"><Cell label="NOME / RAZÃO SOCIAL" value={recipient}/><Cell label="CNPJ / CPF" value={doc(recipientDoc)}/><Cell label="UF" value={p.destUF||p.dest?.UF||"—"}/></div><div className="grid grid-cols-[1.4fr_.35fr_.65fr_.8fr] border-t border-black divide-x divide-black"><Cell label="ENDEREÇO" value={p.destLogradouro||p.dest?.xLgr||"—"}/><Cell label="Nº" value={p.destNumero||p.dest?.nro||"—"}/><Cell label="BAIRRO" value={p.destBairro||p.dest?.xBairro||"—"}/><Cell label="MUNICÍPIO" value={p.destMunicipio||p.dest?.xMun||"—"}/></div></div>
   <div className="mt-1 border-2 border-black"><SectionTitle>DADOS DOS PRODUTOS / SERVIÇOS</SectionTitle><div className="grid grid-cols-[.48fr_1.7fr_.6fr_.55fr_.42fr_.42fr_.62fr] border-t border-black bg-[#f1f1f1] text-[7px] font-bold"><Head>CÓDIGO</Head><Head>DESCRIÇÃO</Head><Head>NCM / SERV.</Head><Head>CFOP</Head><Head>UN.</Head><Head>QTD.</Head><Head>VALOR TOTAL</Head></div><div className="grid min-h-[64px] grid-cols-[.48fr_1.7fr_.6fr_.55fr_.42fr_.42fr_.62fr] divide-x divide-black border-t border-black"><Data>{p.codigoProduto||"—"}</Data><Data>{item}</Data><Data>{p.ncm||p.codigoTributacao||"—"}</Data><Data>{p.cfop||p.cfopCte||"—"}</Data><Data>{p.unidade||"UN"}</Data><Data>{p.quantidade||p.qCarga||"1"}</Data><Data>{money(total)}</Data></div></div>
   <div className="mt-1 grid grid-cols-[1.7fr_.7fr] border-2 border-black"><div className="border-r-2 border-black"><SectionTitle>CÁLCULO DO IMPOSTO / INFORMAÇÕES FISCAIS</SectionTitle><div className="grid grid-cols-3 divide-x divide-black border-t border-black"><Cell label="BASE ICMS" value="R$ 0,00"/><Cell label="VALOR ICMS" value="R$ 0,00"/><Cell label="VALOR PRODUTOS / SERVIÇOS" value={money(total)}/></div></div><div><SectionTitle>TOTAL DA NOTA</SectionTitle><div className="flex h-[48px] items-center justify-center border-t border-black text-[18px] font-bold">{money(total)}</div></div></div>
   <div className="mt-1 border-2 border-black"><SectionTitle>DADOS ADICIONAIS</SectionTitle><div className="min-h-[54px] p-2 text-[9px]">{environment!=="production"?"DOCUMENTO EMITIDO EM AMBIENTE DE HOMOLOGAÇÃO - SEM VALOR FISCAL. ":""}{rejection?`Retorno fiscal: ${rejection}`:""}{imported?" Documento importado/extraído; não emitido originalmente por este sistema.":""}</div></div>
  </div>
 </div>
}
function SectionTitle({children}:{children:any}){return <div className="bg-[#ededed] px-2 py-1 text-[8px] font-bold">{children}</div>}
function Box({label,value}:{label:string;value:any}){return <div><div className="text-[7px] font-bold">{label}</div><div className="mt-0.5 font-bold">{String(value??"—")}</div></div>}
function Cell({label,value}:{label:string;value:any}){return <div className="p-1.5"><div className="text-[7px] font-bold">{label}</div><div className="mt-1 break-words text-[9px]">{String(value??"—")}</div></div>}
function Head({children}:{children:any}){return <div className="border-r border-black p-1 last:border-r-0">{children}</div>}
function Data({children}:{children:any}){return <div className="p-1.5 text-[8px]">{children}</div>}
