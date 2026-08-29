import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

type Props={
 organizationId:string;
 organizationName?:string;
 profile:any;
 certificateConfigured:boolean;
 emissionsCount:number;
 onOpenCompany:()=>void;
 onStartEmission:()=>void;
 onDismiss:()=>void;
};

export default function SaasSetupGuide({organizationId,organizationName,profile,certificateConfigured,emissionsCount,onOpenCompany,onStartEmission,onDismiss}:Props){
 const [step,setStep]=useState(0);
 const checks=useMemo(()=>[
  {label:"Dados da empresa",done:Boolean(profile?.tax_id&&profile?.legal_name&&profile?.state_registration&&profile?.city_ibge_code),detail:"CNPJ, razão social, inscrição estadual, município e regime tributário."},
  {label:"Certificado digital A1",done:certificateConfigured,detail:"Certificado que identifica a empresa e permite assinar os documentos fiscais."},
  {label:"Padrões de emissão",done:Boolean(profile?.tax_regime&&profile?.crt&&profile?.fiscal_environment),detail:"Regime, CRT, ambiente, séries e numeração dos documentos."},
  {label:"Primeira emissão",done:emissionsCount>0,detail:"Faça uma emissão de teste em homologação para validar o fluxo."},
 ],[profile,certificateConfigured,emissionsCount]);
 const completed=checks.filter(x=>x.done).length;
 const percent=Math.round(completed/checks.length*100);
 const current=checks[step];
 return <div className="mx-auto max-w-[1120px] py-4 text-[#111827]">
  <div className="overflow-hidden rounded-2xl border border-[#d7dde5] bg-white shadow-sm">
   <div className="border-b border-[#e0e5eb] bg-[#f8fafc] px-7 py-6 md:px-9">
    <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#7b8798]">Configuração inicial</p>
    <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
     <div><h1 className="text-3xl font-semibold tracking-[-.04em]">Vamos deixar {organizationName||"sua empresa"} pronta para emitir</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[#667085]">Antes da primeira nota, precisamos validar os dados obrigatórios e o certificado da empresa. Você pode concluir cada etapa no seu ritmo.</p></div>
     <button onClick={onDismiss} className="text-xs font-semibold text-[#667085] hover:text-[#111827]">Fazer depois e não mostrar novamente</button>
    </div>
    <div className="mt-6"><div className="flex items-center justify-between text-xs"><span className="font-medium">{completed} de {checks.length} etapas concluídas</span><span>{percent}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-[#e8edf2]"><div className="h-full rounded-full bg-[#1f2937] transition-all" style={{width:`${percent}%`}}/></div></div>
   </div>
   <div className="grid md:grid-cols-[300px_1fr]">
    <div className="border-r border-[#e0e5eb] bg-[#fbfcfd] p-4 md:p-5">{checks.map((item,i)=><button key={item.label} onClick={()=>setStep(i)} className={`mb-2 w-full rounded-xl border px-4 py-4 text-left transition ${step===i?"border-[#9aa7b7] bg-white shadow-sm":"border-transparent hover:bg-white"}`}><div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold">{item.label}</span><span className={`rounded-full px-2 py-1 text-[9px] font-semibold uppercase tracking-[.1em] ${item.done?"bg-emerald-50 text-emerald-700":"bg-amber-50 text-amber-700"}`}>{item.done?"Concluído":"Pendente"}</span></div><p className="mt-1.5 text-xs leading-5 text-[#7b8798]">{item.detail}</p></button>)}</div>
    <div className="p-7 md:p-9">
     <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#8a96a6]">Etapa {step+1}</p><h2 className="mt-2 text-2xl font-semibold">{current.label}</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-[#667085]">{current.detail}</p>
     {step===0&&<div className="mt-7 rounded-xl border border-[#e0e5eb] bg-[#f8fafc] p-5"><p className="text-sm font-semibold">Dados que verificamos</p><div className="mt-4 grid gap-3 sm:grid-cols-2 text-xs text-[#667085]"><p>CNPJ e razão social</p><p>Inscrição estadual</p><p>Regime tributário e CRT</p><p>Município e código IBGE</p><p>Endereço do emitente</p><p>Contato fiscal</p></div></div>}
     {step===1&&<div className="mt-7 rounded-xl border border-[#e0e5eb] bg-[#f8fafc] p-5"><p className="text-sm font-semibold">Certificado A1</p><p className="mt-2 text-xs leading-5 text-[#667085]">Envie o arquivo .PFX ou .P12 e informe a senha. O sistema valida titularidade e vencimento antes de liberar a emissão.</p></div>}
     {step===2&&<div className="mt-7 rounded-xl border border-[#e0e5eb] bg-[#f8fafc] p-5"><p className="text-sm font-semibold">Padrões fiscais</p><p className="mt-2 text-xs leading-5 text-[#667085]">Defina séries, próximas numerações, CFOPs padrão, ambiente fiscal e documentos usados pela empresa.</p></div>}
     {step===3&&<div className="mt-7 rounded-xl border border-[#e0e5eb] bg-[#f8fafc] p-5"><p className="text-sm font-semibold">Emissão de teste</p><p className="mt-2 text-xs leading-5 text-[#667085]">A primeira transmissão deve ocorrer em homologação. Assim você confere cadastro, certificado, tributação e comunicação com o autorizador sem gerar uma nota válida em produção.</p></div>}
     <div className="mt-8 flex flex-wrap gap-3">{step<3?<Button onClick={onOpenCompany} className="bg-[#202833] text-white">Abrir Minha Empresa</Button>:<Button onClick={onStartEmission} className="bg-[#202833] text-white">Emitir primeira nota de teste</Button>}{step<checks.length-1&&<Button variant="outline" onClick={()=>setStep(s=>Math.min(checks.length-1,s+1))}>Próxima etapa</Button>}</div>
    </div>
   </div>
  </div>
  <p className="mt-4 text-center text-[11px] text-[#8a96a6]">Preferência salva somente para esta organização ({organizationId.slice(0,8)}).</p>
 </div>;
}