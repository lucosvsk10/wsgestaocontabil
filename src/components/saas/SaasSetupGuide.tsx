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
 return <div className="fixed inset-0 z-[180] flex items-center justify-center bg-[#111827]/45 p-4 backdrop-blur-[2px]">
  <div className="max-h-[88vh] w-full max-w-[980px] overflow-y-auto rounded-xl border border-[#d7dde5] bg-white text-[#111827] shadow-2xl">
   <div className="border-b border-[#e0e5eb] bg-[#f8fafc] px-6 py-5 md:px-7">
    <div className="flex items-start justify-between gap-5">
     <div><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#7b8798]">Configuração inicial</p><h1 className="mt-2 text-2xl font-semibold tracking-[-.035em]">Vamos terminar a configuração da {organizationName||"sua empresa"}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[#667085]">Complete os dados essenciais para emitir com segurança. Você pode continuar usando o painel e concluir isso depois.</p></div>
     <button onClick={onDismiss} className="shrink-0 rounded-md border border-[#202833] bg-white px-4 py-2 text-xs font-semibold text-[#202833] shadow-sm transition hover:bg-[#f1f4f7]">Agora não</button>
    </div>
    <div className="mt-5"><div className="flex items-center justify-between text-xs"><span className="font-medium">{completed} de {checks.length} etapas concluídas</span><span>{percent}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-[#e8edf2]"><div className="h-full rounded-full bg-[#202833] transition-all" style={{width:`${percent}%`}}/></div></div>
   </div>
   <div className="grid md:grid-cols-[260px_1fr]">
    <div className="border-r border-[#e0e5eb] bg-[#fbfcfd] p-4">{checks.map((item,i)=><button key={item.label} onClick={()=>setStep(i)} className={`mb-2 w-full rounded-lg border px-4 py-3.5 text-left transition ${step===i?"border-[#9aa7b7] bg-white shadow-sm":"border-transparent hover:bg-white"}`}><div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold">{item.label}</span><span className={`rounded-full px-2 py-1 text-[9px] font-semibold uppercase tracking-[.1em] ${item.done?"bg-emerald-50 text-emerald-700":"bg-amber-50 text-amber-700"}`}>{item.done?"Concluído":"Pendente"}</span></div><p className="mt-1.5 text-xs leading-5 text-[#7b8798]">{item.detail}</p></button>)}</div>
    <div className="p-6 md:p-7">
     <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#8a96a6]">Etapa {step+1}</p><h2 className="mt-2 text-xl font-semibold">{current.label}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#667085]">{current.detail}</p>
     {step===0&&<div className="mt-6 rounded-lg border border-[#e0e5eb] bg-[#f8fafc] p-5"><p className="text-sm font-semibold">Dados que verificamos</p><div className="mt-4 grid gap-3 text-xs text-[#667085] sm:grid-cols-2"><p>CNPJ e razão social</p><p>Inscrição estadual</p><p>Regime tributário e CRT</p><p>Município e código IBGE</p><p>Endereço do emitente</p><p>Contato fiscal</p></div></div>}
     {step===1&&<div className="mt-6 rounded-lg border border-[#e0e5eb] bg-[#f8fafc] p-5"><p className="text-sm font-semibold">Certificado A1</p><p className="mt-2 text-xs leading-5 text-[#667085]">Envie o arquivo .PFX ou .P12 e informe a senha. O sistema valida titularidade e vencimento antes de liberar a emissão.</p></div>}
     {step===2&&<div className="mt-6 rounded-lg border border-[#e0e5eb] bg-[#f8fafc] p-5"><p className="text-sm font-semibold">Padrões fiscais</p><p className="mt-2 text-xs leading-5 text-[#667085]">Defina séries, próximas numerações, CFOPs padrão, ambiente fiscal e documentos usados pela empresa.</p></div>}
     {step===3&&<div className="mt-6 rounded-lg border border-[#e0e5eb] bg-[#f8fafc] p-5"><p className="text-sm font-semibold">Emissão de teste</p><p className="mt-2 text-xs leading-5 text-[#667085]">A primeira transmissão deve ocorrer em homologação. Assim você valida o fluxo sem gerar uma nota válida em produção.</p></div>}
     <div className="mt-7 flex flex-wrap gap-3">{step<3?<Button onClick={onOpenCompany}>Abrir Minha Empresa</Button>:<Button onClick={onStartEmission}>Emitir primeira nota de teste</Button>}{step<checks.length-1&&<Button variant="outline" onClick={()=>setStep(s=>Math.min(checks.length-1,s+1))}>Próxima etapa</Button>}<button onClick={onDismiss} className="rounded-md border border-[#aeb8c5] bg-white px-4 py-2 text-sm font-semibold text-[#344054] hover:bg-[#f5f7f9]">Lembrar depois</button></div>
    </div>
   </div>
   <div className="border-t border-[#e0e5eb] bg-[#fbfcfd] px-6 py-3 text-center text-[11px] text-[#7b8798]">Essa preferência fica salva somente para esta organização ({organizationId.slice(0,8)}).</div>
  </div>
 </div>;
}