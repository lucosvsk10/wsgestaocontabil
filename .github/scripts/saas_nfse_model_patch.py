from pathlib import Path


def replace(path, old, new, label):
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f'missing patch target: {label} in {path}')
    p.write_text(text.replace(old, new, 1))


# NFS-e emission form: NBS and complete context for DANFSe.
path = 'src/components/saas/SaasEmission.tsx'
replace(path,
"  serviceCode: '',\n  municipioPrestacao: '',",
"  serviceCode: '',\n  nbsCode: '',\n  municipioPrestacao: '',",
'initial nbs')
replace(path,
"      municipioPrestacao: 7,\n      munIniCodigo: 7,",
"      municipioPrestacao: 7,\n      nbsCode: 9,\n      munIniCodigo: 7,",
'nbs digit limit')
replace(path,
"          next.description = selected.description || selected.name;\n          next.serviceCode = selected.service_code_national || profile?.default_nfse_service_code || '';",
"          next.description = selected.description || selected.name;\n          next.serviceCode = selected.service_code_national || profile?.default_nfse_service_code || '';\n          next.nbsCode = selected.nbs_code || '';",
'service selected nbs')
replace(path,
"        if (parts.fiscal) values.serviceCode = String(payload.codigoTributacao || '');",
"        if (parts.fiscal) {\n          values.serviceCode = String(payload.codigoTributacao || '');\n          values.nbsCode = String(payload.nbsCode || payload.nbs || '');\n        }",
'reuse nbs')
old_payload = """  const nfsePayload = () => ({
    environment,
    serie: form.series,
    numero: form.number,
    municipioEmissor: profile?.city_ibge_code,
    municipioPrestacao: form.municipioPrestacao,
    codigoTributacao: form.serviceCode,
    descricao: form.description,
    valor: Number(form.value),
    tomadorDocumento: customer?.tax_id,
    tomadorNome: customer?.legal_name,
    simples: profile?.tax_regime === 'simples' ? '1' : '2',
    issRetido: Boolean(service?.iss_withheld),
  });"""
new_payload = """  const nfsePayload = () => ({
    environment,
    serie: form.series,
    numero: form.number,
    municipioEmissor: profile?.city_ibge_code,
    municipioPrestacao: form.municipioPrestacao,
    municipioPrestacaoNome: form.municipioPrestacaoNome,
    municipioPrestacaoUf: form.municipioPrestacaoUf,
    codigoTributacao: form.serviceCode,
    codigoTributacaoMunicipal: service?.service_code_municipal || '',
    nbsCode: digits(form.nbsCode),
    nbs: digits(form.nbsCode),
    servicoNome: service?.name || '',
    descricao: form.description,
    valor: Number(form.value),
    tomadorDocumento: customer?.tax_id,
    tomadorNome: customer?.legal_name,
    tomadorInscricaoMunicipal: customer?.municipal_registration || '',
    tomadorTelefone: customer?.phone || customer?.mobile || '',
    tomadorEmail: customer?.email || '',
    tomadorCep: customer?.postal_code || '',
    tomadorMunicipio: customer?.city || '',
    tomadorUf: customer?.state || '',
    tomadorMunicipioIbge: customer?.city_ibge_code || '',
    tomadorEndereco: [customer?.street, customer?.street_number, customer?.complement, customer?.district].filter(Boolean).join(', '),
    informacoesComplementares: service?.fiscal_notes || '',
    simples: profile?.tax_regime === 'simples' ? '1' : '2',
    issRetido: Boolean(service?.iss_withheld),
  });"""
replace(path, old_payload, new_payload, 'nfse payload')
replace(path,
"        need(/^\\d{6}$/.test(digits(form.serviceCode)), 'código de tributação nacional com 6 dígitos');\n        need(String(form.description).trim(), 'descrição do serviço');",
"        need(/^\\d{6}$/.test(digits(form.serviceCode)), 'código de tributação nacional com 6 dígitos');\n        need(/^\\d{9}$/.test(digits(form.nbsCode)), 'Código da NBS com 9 dígitos');\n        need(String(form.description).trim(), 'descrição do serviço');",
'nbs validation')
replace(path,
"          <FiscalCodeField kind=\"service\" label=\"Código de Tributação Nacional\" value={form.serviceCode} onChange={v => set('serviceCode', v)} required />\n          <div className=\"fe-info-box\"><ReceiptText />",
"          <FiscalCodeField kind=\"service\" label=\"Código de Tributação Nacional\" value={form.serviceCode} onChange={v => set('serviceCode', v)} required />\n          <Field label=\"Código da NBS\" value={form.nbsCode} onChange={v => set('nbsCode', v)} required placeholder=\"1.1404.43.00\" hint=\"Obrigatório para emissão oficial da NFS-e.\" />\n          <div className=\"fe-info-box\"><ReceiptText />",
'nbs field')
replace(path,
"          ['Serviço', service?.name || '—'],\n          ['Valor', money(form.value)],",
"          ['Serviço', service?.name || '—'],\n          ['NBS', digits(form.nbsCode) || '—'],\n          ['Valor', money(form.value)],",
'review nbs')
old_preview = """          descricao: form.description || service?.name,
          valor: Number(form.value || 0),
          tomadorNome: customer?.legal_name,
          tomadorDocumento: customer?.tax_id,
          codigoTributacao: form.serviceCode,"""
new_preview = """          descricao: form.description || service?.name,
          servicoNome: service?.name,
          valor: Number(form.value || 0),
          tomadorNome: customer?.legal_name,
          tomadorDocumento: customer?.tax_id,
          tomadorInscricaoMunicipal: customer?.municipal_registration,
          tomadorTelefone: customer?.phone || customer?.mobile,
          tomadorEmail: customer?.email,
          tomadorCep: customer?.postal_code,
          tomadorMunicipio: customer?.city,
          tomadorUf: customer?.state,
          tomadorMunicipioIbge: customer?.city_ibge_code,
          tomadorEndereco: [customer?.street, customer?.street_number, customer?.complement, customer?.district].filter(Boolean).join(', '),
          municipioPrestacao: form.municipioPrestacao,
          municipioPrestacaoNome: form.municipioPrestacaoNome,
          municipioPrestacaoUf: form.municipioPrestacaoUf,
          codigoTributacao: form.serviceCode,
          codigoTributacaoMunicipal: service?.service_code_municipal,
          nbsCode: digits(form.nbsCode),
          informacoesComplementares: service?.fiscal_notes || '',"""
replace(path, old_preview, new_preview, 'preview payload')

# IE is optional for production activation.
replace('src/pages/SaasApp.tsx',
"    profile?.legal_name &&\n    profile?.state_registration &&\n    profile?.city_ibge_code &&",
"    profile?.legal_name &&\n    profile?.city_ibge_code &&",
'frontend IE requirement')

# NBS is mandatory server-side and transmitted in the national service classification.
path = 'supabase/functions/saas-nfse-issue/index.ts'
replace(path,
"const raw={...(b.data||{}),environment},cnpj=digits(p.tax_id),mun=digits(raw.municipioEmissor||p.city_ibge_code),munPrest=digits(raw.municipioPrestacao||mun),code=digits(raw.codigoTributacao||p.default_nfse_service_code),tomaDoc=digits(raw.tomadorDocumento);",
"const raw={...(b.data||{}),environment},cnpj=digits(p.tax_id),mun=digits(raw.municipioEmissor||p.city_ibge_code),munPrest=digits(raw.municipioPrestacao||mun),code=digits(raw.codigoTributacao||p.default_nfse_service_code),nbs=digits(raw.nbsCode||raw.nbs),tomaDoc=digits(raw.tomadorDocumento);",
'backend nbs variable')
replace(path,
"if(cnpj.length!==14)errors.push(\"CNPJ do prestador inválido\");if(mun.length!==7)errors.push(\"Município emissor inválido\");if(munPrest.length!==7)errors.push(\"Município da prestação inválido\");if(code.length!==6)errors.push(\"Código de tributação nacional deve ter 6 dígitos\");if(!String(raw.descricao||\"\").trim())errors.push(\"Descrição obrigatória\");",
"if(cnpj.length!==14)errors.push(\"CNPJ do prestador inválido\");if(mun.length!==7)errors.push(\"Município emissor inválido\");if(munPrest.length!==7)errors.push(\"Município da prestação inválido\");if(code.length!==6)errors.push(\"Código de tributação nacional deve ter 6 dígitos\");if(nbs.length!==9)errors.push(\"Código NBS deve ter 9 dígitos\");if(!String(raw.descricao||\"\").trim())errors.push(\"Descrição obrigatória\");",
'backend nbs validation')
replace(path,
"serv:{locPrest:{cLocPrestacao:munPrest},cServ:{cTribNac:code,xDescServ:String(raw.descricao).trim()}},",
"serv:{locPrest:{cLocPrestacao:munPrest},cServ:{cTribNac:code,...(digits(raw.codigoTributacaoMunicipal)?{cTribMun:digits(raw.codigoTributacaoMunicipal)}:{}),xDescServ:String(raw.descricao).trim(),cNBS:nbs}},",
'backend nbs XML')

# Replace only the NFS-e auxiliary renderer; other fiscal previews remain untouched.
path_obj = Path('src/components/saas/SaasDanfePreview.tsx')
text = path_obj.read_text()
marker = 'function Nfse(p:any)'
pos = text.find(marker)
if pos < 0:
    raise SystemExit('missing patch target: Nfse renderer')
head = text[:pos]
nfse = r'''function Nfse(p:any){
 const profile=p.profile||{},d=p.p||{},fmtNbs=(v:any)=>{const x=digits(v);return x.length===9?`${x.slice(0,1)}.${x.slice(1,5)}.${x.slice(5,7)}.${x.slice(7)}`:(v||"—")},fmtServ=(v:any)=>{const x=digits(v);return x.length===6?`${x.slice(0,2)}.${x.slice(2,4)}.${x.slice(4)}`:(v||"—")},fmtIbge=(v:any)=>{const x=digits(v);return x.length===7?`${x.slice(0,2)}.${x.slice(2)}`:(v||"—")};
 const emitMunicipality=[profile.city,profile.state].filter(Boolean).join(" / ")||p.emitCity||"—",prestAddress=[profile.street,profile.street_number,profile.complement,profile.district].filter(Boolean).join(", ")||p.emitAddress||"—";
 const tomaMunicipality=[d.tomadorMunicipio,d.tomadorUf].filter(Boolean).join(" / ")||"—",serviceLocation=[d.municipioPrestacaoNome,d.municipioPrestacaoUf].filter(Boolean).join(" / ")||d.municipioPrestacao||"—";
 const competence=d.competencia||String(p.date||"").split(' ')[0]||"—",status=p.status==="authorized"?"NFS-e Gerada":statusLabel(p.status),serviceOfficial=d.servicoNome||p.item||"—";
 const box="border border-black px-1.5 py-1",label="text-[6.5px] font-bold uppercase leading-tight",value="mt-0.5 text-[7px] leading-tight";
 const Mini=({l,v}:{l:string;v:any})=><div className={box}><div className={label}>{l}</div><div className={value}>{v||"—"}</div></div>;
 return <div className="space-y-3">{p.showActions&&<Toolbar id={p.id} title={`DANFSe ${p.number}`} meta={`NFS-e · ${statusLabel(p.status)}`}/>}<div className="saas-preview-shell"><div id={p.id} className="danfe-sheet fiscal-paper mx-auto max-w-[860px] bg-white p-[5px] text-black shadow-sm">
  <div className="grid grid-cols-[1fr_1.45fr_1fr] border-2 border-black">
   <div className="flex items-center gap-2 p-2"><div className="text-[20px] font-black tracking-tight">NFS</div><div className="text-[7px] leading-tight">Nota Fiscal de<br/>Serviço eletrônica</div></div>
   <div className="border-x border-black p-2 text-center"><div className="text-[11px] font-black">DANFSe v2.0</div><div className="text-[10px] font-bold">Documento Auxiliar da NFS-e</div></div>
   <div className="grid grid-cols-[1fr_58px]"><div className="p-1.5 text-[6.5px] leading-tight"><b>Município:</b> {profile.city||d.municipioEmissorNome||"—"} - {profile.state||"—"}<br/><b>Ambiente Gerador:</b> {p.environment==="production"?"1":"2"}<br/><b>Tipo de Ambiente:</b> {p.environment==="production"?"1":"2"}</div><div className="border-l border-black p-1"><Qr value={p.qrValue} size={52}/></div></div>
  </div>
  {p.environment!=="production"&&<div className="border-x-2 border-b border-black py-0.5 text-center text-[6.5px] font-bold">AMBIENTE DE HOMOLOGAÇÃO — SEM VALOR FISCAL</div>}
  <div className="border-x-2 border-b-2 border-black px-1.5 py-1"><div className={label}>CHAVE DE ACESSO DA NFS-e</div><div className="text-[7px] font-bold tracking-[.03em]">{p.access?digits(p.access):"Disponível após autorização"}</div><div className="mt-0.5 text-[6px]">A autenticidade desta NFS-e pode ser verificada pela leitura do QR Code ou pela consulta da chave no Portal Nacional da NFS-e.</div></div>
  <div className="grid grid-cols-3"><Mini l="NÚMERO DA NFS-e" v={p.number}/><Mini l="COMPETÊNCIA DA NFS-e" v={competence}/><Mini l="DATA E HORA DA EMISSÃO DA NFS-e" v={p.date}/><Mini l="NÚMERO DA DPS" v={d.numero||p.number}/><Mini l="SÉRIE DA DPS" v={d.serie||p.series}/><Mini l="DATA E HORA DA EMISSÃO DA DPS" v={p.date}/><Mini l="EMITENTE DA NFS-e" v="Prestador"/><Mini l="SITUAÇÃO DA NFS-e" v={status}/><Mini l="FINALIDADE" v={d.finalidade||"-"}/></div>
  <div className="mt-1 border border-black bg-[#ececec] px-1.5 py-0.5 text-[7px] font-black">PRESTADOR / FORNECEDOR</div>
  <div className="grid grid-cols-3"><Mini l="CNPJ / CPF / NIF" v={doc(p.emitDoc)}/><Mini l="Indicador Municipal (Inscrição)" v={profile.municipal_registration||"-"}/><Mini l="Telefone" v={profile.phone||"-"}/><Mini l="Nome / Nome Empresarial" v={profile.legal_name||p.emitName}/><Mini l="Município / Sigla UF" v={emitMunicipality}/><Mini l="Código IBGE / CEP" v={`${fmtIbge(profile.city_ibge_code)} / ${profile.postal_code||"-"}`}/><div className={`${box} col-span-2`}><div className={label}>Endereço</div><div className={value}>{prestAddress}</div></div><Mini l="E-mail" v={profile.email||"-"}/><Mini l="Simples Nacional na Data de Competência" v={String(profile.tax_regime||"").toLowerCase().includes("simples")?"Optante":"Não informado"}/><div className={`${box} col-span-2`}><div className={label}>Regime de Apuração Tributária pelo SN</div><div className={value}>{String(profile.tax_regime||"").toLowerCase().includes("simples")?"Regime de apuração dos tributos federais e municipal pelo Simples Nacional":"-"}</div></div></div>
  <div className="mt-1 border border-black bg-[#ececec] px-1.5 py-0.5 text-[7px] font-black">TOMADOR / ADQUIRENTE</div>
  <div className="grid grid-cols-3"><Mini l="CNPJ / CPF / NIF" v={doc(p.recipientDoc)}/><Mini l="Indicador Municipal (Inscrição)" v={d.tomadorInscricaoMunicipal||"-"}/><Mini l="Telefone" v={d.tomadorTelefone||"-"}/><Mini l="Nome / Nome Empresarial" v={p.recipient}/><Mini l="Município / Sigla UF" v={tomaMunicipality}/><Mini l="Código IBGE / CEP" v={`${fmtIbge(d.tomadorMunicipioIbge)} / ${d.tomadorCep||"-"}`}/><div className={`${box} col-span-2`}><div className={label}>Endereço</div><div className={value}>{d.tomadorEndereco||"-"}</div></div><Mini l="E-mail" v={d.tomadorEmail||"-"}/></div>
  <div className="grid grid-cols-2 text-center text-[6.5px] font-bold"><div className="border border-black py-0.5">DESTINATÁRIO DA OPERAÇÃO NÃO IDENTIFICADO NA NFS-e</div><div className="border border-black py-0.5">INTERMEDIÁRIO DA OPERAÇÃO NÃO IDENTIFICADO NA NFS-e</div></div>
  <div className="mt-1 border border-black bg-[#ececec] px-1.5 py-0.5 text-[7px] font-black">SERVIÇO PRESTADO</div>
  <div className="grid grid-cols-[1fr_1fr_1.1fr]"><Mini l="Código de Tributação Nacional/Municipal" v={`${fmtServ(d.codigoTributacao)} / ${d.codigoTributacaoMunicipal||"-"}`}/><Mini l="Código da NBS" v={fmtNbs(d.nbsCode||d.nbs)}/><Mini l="Local da Prestação / Sigla UF / País" v={`${serviceLocation} / -`}/></div>
  <div className={box}><div className={label}>{serviceOfficial}</div><div className={`${value} mt-1`}><b>Descrição do Serviço</b><br/>{d.descricao||p.item||"—"}</div></div>
  <div className="mt-1 border border-black bg-[#ececec] px-1.5 py-0.5 text-[7px] font-black">TRIBUTAÇÃO MUNICIPAL (ISSQN)</div>
  <div className="grid grid-cols-4"><Mini l="Tipo de Tributação do ISSQN" v="Operação Tributável"/><Mini l="Município / Sigla UF / País de Incidência do ISSQN" v={`${profile.city||"—"} / ${profile.state||"—"} / -`}/><Mini l="BC ISSQN" v="-"/><Mini l="Alíquota Aplicada" v="-"/><Mini l="Retenção do ISSQN" v={d.issRetido?"Retido":"Não Retido"}/><Mini l="ISSQN Apurado" v="-"/></div>
  <div className="mt-1 border border-black bg-[#ececec] px-1.5 py-0.5 text-[7px] font-black">TRIBUTAÇÃO FEDERAL (EXCETO CBS)</div>
  <div className="grid grid-cols-4"><Mini l="IRRF" v="-"/><Mini l="Contribuição Previdenciária - Retida" v="-"/><Mini l="Contribuições Sociais - Retidas" v="-"/><Mini l="PIS - Débito Apuração Própria" v="-"/><Mini l="COFINS - Débito Apuração Própria" v="-"/><div className={`${box} col-span-3`}><div className={label}>Descrição Contrib. Sociais - Retidas</div><div className={value}>-</div></div></div>
  <div className="mt-1 border border-black bg-[#ececec] px-1.5 py-0.5 text-[7px] font-black">TRIBUTAÇÃO IBS/CBS</div>
  <div className="grid grid-cols-4"><Mini l="CST / cClassTrib" v="- / -"/><Mini l="Indicador de Operação / Código IBGE Incidência / Município Incidência / Sigla UF" v="- / - / - / -"/><Mini l="Exclusões e Reduções da Base de Cálculo" v="R$ 0,00"/><Mini l="Base de Cálculo Após Exclusões e Reduções" v="-"/><Mini l="Red. Alíquota IBS / Red. Alíquota CBS" v="- / - / -"/><Mini l="Alíquota - IBS UF / IBS Mun" v="- / -"/><Mini l="Valor Total Apurado - IBS" v="-"/><Mini l="Valor Total Apurado - CBS" v="-"/></div>
  <div className="mt-1 border border-black bg-[#ececec] px-1.5 py-0.5 text-[7px] font-black">VALOR TOTAL DA NFS-e</div>
  <div className="grid grid-cols-3"><Mini l="VALOR DA OPERAÇÃO / SERVIÇO" v={money(p.total)}/><Mini l="Desconto Incondicionado" v="-"/><Mini l="Desconto Condicionado" v="-"/><Mini l="Total das Retenções (ISSQN / Federais)" v="-"/><Mini l="VALOR LÍQUIDO DA NFS-e" v={money(p.total)}/><Mini l="Total do IBS/CBS" v="R$ 0,00"/></div>
  <div className="border border-black"><div className="bg-[#ececec] px-1.5 py-0.5 text-[7px] font-black">INFORMAÇÕES COMPLEMENTARES</div><div className="min-h-[34px] px-1.5 py-1 text-[6.5px] leading-tight">Inf. Cont.: {d.informacoesComplementares||"-"}<br/>Totais aproximados dos Tributos cfe. Lei nº 12.741/2012: Federais: -; Estaduais: -; Municipais: -;</div></div>
  <div className="mt-2 grid grid-cols-[.75fr_1fr_1.5fr] border-2 border-black text-[6px]"><div className="p-1"><b>DATA CIENTIFICAÇÃO:</b></div><div className="border-x border-black p-1"><b>IDENTIFICAÇÃO E ASSINATURA</b></div><div className="p-1"><b>Nº NFS-e / CHAVE NFS-e</b><br/>{p.number} / {digits(p.access)||"—"}</div></div>
 </div></div></div>
}'''
path_obj.write_text(head + nfse + '\n')
replace('src/components/saas/SaasDanfePreview.tsx',
'if(documentType==="NFS-e")return <Nfse id={id} showActions={showActions}',
'if(documentType==="NFS-e")return <Nfse profile={profile} id={id} showActions={showActions}',
'Nfse profile prop')

# Clean up the temporary runner files after applying the patch.
Path('.github/workflows/saas-nfse-model-update.yml').unlink(missing_ok=True)
Path('.github/scripts/saas_nfse_model_patch.py').unlink(missing_ok=True)
