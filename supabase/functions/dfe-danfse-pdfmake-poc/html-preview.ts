import qrcode from "https://esm.sh/qrcode-generator@1.4.4?target=deno";
import type { DanfseData } from "./types.ts";
import { DANFSE_OFFICIAL_TEMPLATE } from "./danfse-official-template.ts";

const esc=(v:unknown)=>String(v??"-")
  .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
  .replace(/"/g,"&quot;").replace(/'/g,"&#39;");

const qrSvgDataUrl=(value:string)=>{
  const qr=qrcode(0,"M"); qr.addData(value); qr.make();
  const n=qr.getModuleCount(), quiet=4, cell=4, size=(n+quiet*2)*cell;
  let paths="";
  for(let r=0;r<n;r++){
    let c=0;
    while(c<n){
      if(!qr.isDark(r,c)){c++;continue;}
      const start=c;
      while(c<n&&qr.isDark(r,c)) c++;
      paths+='<rect x="'+((start+quiet)*cell)+'" y="'+((r+quiet)*cell)+'" width="'+((c-start)*cell)+'" height="'+cell+'"/>';
    }
  }
  const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+size+' '+size+'" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="white"/><g fill="black">'+paths+'</g></svg>';
  return "data:image/svg+xml;base64,"+btoa(unescape(encodeURIComponent(svg)));
};

const simpleNationalDisplay=(v:unknown)=>{
  const raw=String(v||"-").replace(/\s+/g," ").trim();
  if(/Optante\s*-\s*Microempresa/i.test(raw) && /Pequeno Porte/i.test(raw)){
    return "Optante - Microempresa ou Empresa de ...";
  }
  return raw;
};

export function renderDanfseOfficialHtml(d:DanfseData){
  const vals:Record<string,string>={
    issueCityUf:d.issueCity+" - "+d.issueUf,
    generatorEnvironment:d.generatorEnvironment,
    environmentType:d.environmentType,
    qrDataUrl:qrSvgDataUrl(d.qrValue),
    accessKey:d.accessKey,
    number:d.number,
    competency:d.competency,
    issueDate:d.issueDate,
    dpsNumber:d.dpsNumber,
    dpsSeries:d.dpsSeries,
    dpsIssueDate:d.dpsIssueDate,
    emitterType:d.emitterType,
    status:d.status,
    purpose:d.purpose,
    prestadorDoc:d.prestador.doc,
    prestadorMunicipalRegistration:d.prestador.municipalRegistration,
    prestadorPhone:d.prestador.phone,
    prestadorName:d.prestador.name,
    prestadorCityUf:d.prestador.cityUf,
    prestadorIbgeCep:d.prestador.ibgeCep,
    prestadorAddress:d.prestador.address,
    prestadorEmail:d.prestador.email,
    prestadorSimpleNational:simpleNationalDisplay(d.prestador.simpleNational),
    prestadorTaxRegime:d.prestador.taxRegime,
    tomadorDoc:d.tomador.doc,
    tomadorMunicipalRegistration:d.tomador.municipalRegistration,
    tomadorPhone:d.tomador.phone,
    tomadorName:d.tomador.name,
    tomadorCityUf:d.tomador.cityUf,
    tomadorIbgeCep:d.tomador.ibgeCep,
    tomadorAddress:d.tomador.address,
    tomadorEmail:d.tomador.email,
    serviceNationalMunicipalCode:d.service.nationalMunicipalCode,
    serviceNbs:d.service.nbs,
    serviceLocation:d.service.location,
    serviceClassification:d.service.classification,
    serviceDescription:d.service.description,
    municipalType:d.municipalTax.type,
    municipalIncidence:d.municipalTax.incidence,
    municipalBase:d.municipalTax.base,
    municipalRate:d.municipalTax.rate,
    municipalRetention:d.municipalTax.retention,
    municipalAmount:d.municipalTax.amount,
    federalIrrf:d.federalTax.irrf,
    federalPrevidencia:d.federalTax.previdencia,
    federalSociais:d.federalTax.sociais,
    federalPis:d.federalTax.pis,
    federalCofins:d.federalTax.cofins,
    federalRetainedDescription:d.federalTax.retainedDescription,
    ibsCstClass:d.ibsCbs.cstClass,
    ibsOperationIncidence:d.ibsCbs.operationIncidence,
    ibsExclusions:d.ibsCbs.exclusions,
    ibsBase:d.ibsCbs.base,
    ibsReduction:d.ibsCbs.reduction,
    ibsRateUfMun:d.ibsCbs.rateUfMun,
    ibsEffectiveMunicipal:d.ibsCbs.effectiveMunicipal,
    ibsAmountMunicipal:d.ibsCbs.amountMunicipal,
    ibsEffectiveState:d.ibsCbs.effectiveState,
    ibsAmountState:d.ibsCbs.amountState,
    ibsTotal:d.ibsCbs.totalIbs,
    cbsRate:d.ibsCbs.cbsRate,
    cbsEffective:d.ibsCbs.cbsEffective,
    cbsTotal:d.ibsCbs.cbsTotal,
    totalOperation:d.totals.operation,
    totalUnconditionalDiscount:d.totals.unconditionalDiscount,
    totalConditionalDiscount:d.totals.conditionalDiscount,
    totalRetentions:d.totals.retentions,
    totalNet:d.totals.net,
    totalIbsCbs:d.totals.ibsCbs,
    totalNetPlusIbsCbs:d.totals.netPlusIbsCbs,
    additionalInfoLine:"Inf. Cont.: "+(d.additionalInfo||"-"),
    approximateTaxes:d.approximateTaxes,
    footerNumberKey:d.number+" / "+d.accessKey,
  };

  let html=DANFSE_OFFICIAL_TEMPLATE;
  for(const [key,value] of Object.entries(vals)){
    html=html.replaceAll("{{"+key+"}}",key==="qrDataUrl"?value:esc(value));
  }

  const previewPatch = [
    '<style id="ws-danfse-preview-patch">',
    'html,body{margin:0!important;padding:0!important;background:#fff!important;width:793.33px!important;height:1122.67px!important;overflow:hidden!important}',
    '.page{margin:0!important;box-shadow:none!important}',
    '.dyn{font-family:Arial,Helvetica,sans-serif!important;overflow:hidden!important;box-sizing:border-box!important}',
    '[data-bind="prestadorSimpleNational"]{white-space:nowrap!important;text-overflow:clip!important;height:12px!important}',
    '[data-bind="prestadorTaxRegime"]{white-space:nowrap!important;height:12px!important}',
    '[data-bind="prestadorAddress"],[data-bind="prestadorEmail"],[data-bind="tomadorAddress"],[data-bind="tomadorEmail"]{white-space:nowrap!important}',
    '[data-bind="serviceClassification"]{white-space:normal!important;line-height:10.56px!important}',
    '[data-bind="serviceDescription"]{white-space:pre-wrap!important;line-height:10.56px!important}',
    '</style>',
    '<script>',
    '(function(){',
    'function setY(el,y){if(!el)return;var s=el.getAttribute("style")||"";s=s.replace(/transform:matrix\\(1,0,0,1,([-\\d.]+),([-\\d.]+)\\)/,"transform:matrix(1,0,0,1,$1,"+y+")");el.setAttribute("style",s);}',
    'function adjustService(){var cls=document.querySelector(\'[data-bind="serviceClassification"]\');var desc=document.querySelector(\'[data-bind="serviceDescription"]\');if(!cls||!desc)return;var lineHeight=10.56;var lines=Math.max(1,Math.round(cls.scrollHeight/lineHeight));var offset=(lines-1)*lineHeight;var labels=Array.from(document.querySelectorAll(".t.c0")).filter(function(el){var style=el.getAttribute("style")||"";var t=(el.textContent||"").trim();return style.indexOf(",411.53)")>=0&&(t==="Descrição"||t==="do"||t==="Serviço");});labels.forEach(function(el){setY(el,411.53+offset);});setY(desc,420.46+offset);}',
    'requestAnimationFrame(adjustService);',
    '})();',
    '<\/script>'
  ].join("");

  html=html.replace("</head>",previewPatch+"</head>");
  return html;
}
