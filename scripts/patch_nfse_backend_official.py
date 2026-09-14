from pathlib import Path

p=Path('supabase/functions/saas-nfse-issue/index.ts')
s=p.read_text()
start=s.index('    const regime=String(p.tax_regime||"").toLowerCase()')
end=s.index('    const signed=assinarXml',start)
new=r'''    const regime=String(p.tax_regime||"").toLowerCase(),isMei=regime.includes("mei"),isMeEpp=regime.includes("simples")&&!isMei;
    const regApTribSN=String(raw.regApTribSN||"1"),regEspTrib=String(raw.regimeEspecial||"0");
    if(isMeEpp&&!['1','2','3'].includes(regApTribSN))return out({error:"Dados incompletos",errors:["Regime de Apuração dos Tributos no Simples Nacional inválido"]},422);
    if(!['0','1','2','3','4','5','6','9'].includes(regEspTrib))return out({error:"Dados incompletos",errors:["Regime Especial de Tributação inválido"]},422);
    const reg:any={opSimpNac:isMei?"2":isMeEpp?"3":"1",regEspTrib};if(isMeEpp)reg.regApTribSN=regApTribSN;
    const simplesTaxRate=Number(raw.simplesTaxRate);
    if(isMeEpp&&(!(simplesTaxRate>0)||simplesTaxRate>100))return out({error:"Dados incompletos",errors:["Informe a alíquota total do Simples Nacional (%)"]},422);
    const competencia=String(raw.competencia||"");
    if(!/^\d{4}-\d{2}-\d{2}$/.test(competencia)||Number.isNaN(Date.parse(`${competencia}T12:00:00`)))return out({error:"Dados incompletos",errors:["Data de competência inválida"]},422);
    const tpAmb=environment==="production"?"1":"2",im=digits(p.municipal_registration),cServ:any={cTribNac:code,...(digits(raw.codigoTributacaoMunicipal)?{cTribMun:digits(raw.codigoTributacaoMunicipal)}:{}),xDescServ:String(raw.descricao).trim(),...(nbs?{cNBS:nbs}:{})};
    const totalPlaceholder:any={pTotTribFed:0,pTotTribEst:0,pTotTribMun:0};
    const prest:any={CNPJ:cnpj,...(im?{IM:im}:{}),xNome:String(p.legal_name||''),regTrib:reg};
    const prestCep=digits(p.postal_code),prestMun=digits(p.city_ibge_code);
    if(prestCep.length===8&&prestMun.length===7&&p.street&&p.street_number&&p.district)prest.end={cMun:prestMun,CEP:prestCep,xLgr:String(p.street),nro:String(p.street_number),...(p.complement?{xCpl:String(p.complement)}:{}),xBairro:String(p.district)};
    if(p.phone)prest.fone=digits(p.phone);if(p.email)prest.email=String(p.email);
    const tribMun:any={tribISSQN:String(raw.tributacaoIss||"1"),tpRetISSQN:raw.issRetido?"2":"1"};
    const issAliquota=Number(raw.issAliquota);if(issAliquota>0&&issAliquota<=100)tribMun.pAliq=issAliquota;
    const tribFed:any={};
    const federalSituacao=String(raw.federalSituacao||"00"),pisCofinsBase=Number(raw.basePisCofins||0),pisAliq=Number(raw.pisAliquota||0),cofinsAliq=Number(raw.cofinsAliquota||0),pisValor=Number(raw.pisValor||0),cofinsValor=Number(raw.cofinsValor||0);
    if(federalSituacao!=="00")tribFed.piscofins={CST:federalSituacao,vBCPisCofins:pisCofinsBase,pAliqPis:pisAliq,pAliqCofins:cofinsAliq,vPis:pisValor,vCofins:cofinsValor,tpRetPisCofins:String(raw.tpRetPisCofins||"0")};
    const retCP=Number(raw.cppValor||0),retIRRF=Number(raw.irrfValor||0),retCSLL=Number(raw.csllValor||0);if(retCP>0)tribFed.vRetCP=retCP;if(retIRRF>0)tribFed.vRetIRRF=retIRRF;if(retCSLL>0)tribFed.vRetCSLL=retCSLL;
    const valores:any={vServPrest:{vServ:Number(raw.valor)},trib:{tribMun,...(Object.keys(tribFed).length?{tribFed}:{}),totTrib:totalPlaceholder}};
    const vDescIncond=Number(raw.descontoIncondicionado||0),vDescCond=Number(raw.descontoCondicionado||0);if(vDescIncond>0||vDescCond>0)valores.vDescCondIncond={...(vDescIncond>0?{vDescIncond}:{}),...(vDescCond>0?{vDescCond}:{})};
    const dados:any={tpAmb,dhEmi:new Date(),verAplic:"WS-SAAS-3.0",serie:String(raw.serie),nDPS:String(raw.numero),dCompet:new Date(`${competencia}T12:00:00`),tpEmit:"1",cLocEmi:mun,prest,serv:{locPrest:{cLocPrestacao:munPrest},cServ},valores};
    const tomaDocRaw=digits(raw.tomadorDocumento),tomaNome=String(raw.tomadorNome||"").trim();
    if(tomaDocRaw&&tomaNome){const toma:any={...(tomaDocRaw.length===14?{CNPJ:tomaDocRaw}:{CPF:tomaDocRaw}),xNome:tomaNome};const tMun=digits(raw.tomadorMunicipioIbge),tCep=digits(raw.tomadorCep);if(raw.tomadorInscricaoMunicipal)toma.IM=digits(raw.tomadorInscricaoMunicipal);if(tMun.length===7&&tCep.length===8&&raw.tomadorLogradouro&&raw.tomadorNumero&&raw.tomadorBairro)toma.end={cMun:tMun,CEP:tCep,xLgr:String(raw.tomadorLogradouro),nro:String(raw.tomadorNumero),...(raw.tomadorComplemento?{xCpl:String(raw.tomadorComplemento)}:{}),xBairro:String(raw.tomadorBairro)};if(raw.tomadorTelefone)toma.fone=digits(raw.tomadorTelefone);if(raw.tomadorEmail)toma.email=String(raw.tomadorEmail);dados.toma=toma;}
    if(raw.temIntermediario){const iDoc=digits(raw.intermediarioDocumento),iNome=String(raw.intermediarioNome||"").trim();if(!iNome||![11,14].includes(iDoc.length))return out({error:"Dados incompletos",errors:["Intermediário deve possuir CPF/CNPJ e nome válidos"]},422);dados.interm={...(iDoc.length===14?{CNPJ:iDoc}:{CPF:iDoc}),xNome:iNome,...(digits(raw.intermediarioIM)?{IM:digits(raw.intermediarioIM)}:{})};}
    if(raw.preencherIbsCbs&&raw.ibsCbs){const ibs=raw.ibsCbs,cIndOp=digits(ibs.cIndOp),classTrib=digits(ibs.cClassTrib);if(cIndOp.length!==6||classTrib.length<3)return out({error:"Dados incompletos",errors:["IBS/CBS exige cIndOp com 6 dígitos e classificação tributária válida"]},422);dados.IBSCBS={finNFSe:"0",indFinal:String(ibs.indFinal||"0"),cIndOp,...(raw.compraGovernamental?{tpOper:String(ibs.tpOper||"5"),tpEnteGov:String(ibs.tpEnteGov||"1")} : {}),indDest:String(ibs.indDest||"0"),valores:{trib:{gIBSCBS:{cClassTrib:classTrib}}}};}
    const mounted=montarXmlDps(dados);
    const oldTotTrib="<pTotTrib><pTotTribFed>0.00</pTotTribFed><pTotTribEst>0.00</pTotTribEst><pTotTribMun>0.00</pTotTribMun></pTotTrib>";
    let xmlBeforeSign=mounted.xml;
    if(isMeEpp){xmlBeforeSign=xmlBeforeSign.replace(oldTotTrib,`<pTotTribSN>${simplesTaxRate.toFixed(2)}</pTotTribSN>`);if(!xmlBeforeSign.includes("<pTotTribSN>")||xmlBeforeSign.includes("<indTotTrib>"))throw new Error("Falha ao montar tributação total da ME/EPP");}
    else{xmlBeforeSign=xmlBeforeSign.replace(oldTotTrib,"<indTotTrib>0</indTotTrib>");if(xmlBeforeSign===mounted.xml)throw new Error("Falha ao normalizar o grupo totTrib antes da assinatura");}
    const deducao=Number(raw.deducaoReducao||0);if(deducao>0){const marker="</vDescCondIncond>";const dedXml=`<vDedRed><vDR>${deducao.toFixed(2)}</vDR></vDedRed>`;if(xmlBeforeSign.includes(marker))xmlBeforeSign=xmlBeforeSign.replace(marker,marker+dedXml);else xmlBeforeSign=xmlBeforeSign.replace("</vServPrest>","</vServPrest>"+dedXml);}
    const infoCompl=String(raw.informacoesComplementares||"").trim();if(infoCompl){const esc=infoCompl.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;");xmlBeforeSign=xmlBeforeSign.replace("</serv>",`<infoCompl><xInfComp>${esc}</xInfComp></infoCompl></serv>`);}
'''
s=s[:start]+new+s[end:]
p.write_text(s)
print('patched backend')
