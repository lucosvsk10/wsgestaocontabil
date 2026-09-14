from pathlib import Path

# 1) NfseOfficialFlow: service registry becomes optional helper and review reflects form state.
p = Path('src/components/saas/NfseOfficialFlow.tsx')
s = p.read_text()
s = s.replace('onCreate={()=>onOpenCadastro?.(\'Serviços\')} required/>','onCreate={()=>onOpenCadastro?.(\'Serviços\')} />')
s = s.replace('<Readonly label="Descrição do serviço" value={service?.name}/>','<Readonly label="Descrição do serviço" value={form.description || service?.name}/>')
p.write_text(s)

# 2) SaasEmission: remove artificial requirement for saved service and make preview use live form values.
p = Path('src/components/saas/SaasEmission.tsx')
s = p.read_text()
s = s.replace("        need(service, 'serviço');\n", '')
s = s.replace("          tomadorNome: customer?.legal_name,\n          tomadorDocumento: customer?.tax_id,\n          tomadorInscricaoMunicipal: customer?.municipal_registration,\n          tomadorTelefone: customer?.phone || customer?.mobile,\n          tomadorEmail: customer?.email,\n          tomadorCep: customer?.postal_code,\n          tomadorMunicipio: customer?.city,\n          tomadorUf: customer?.state,\n          tomadorMunicipioIbge: customer?.city_ibge_code,\n          tomadorEndereco: [customer?.street, customer?.street_number, customer?.complement, customer?.district].filter(Boolean).join(', '),",
"          tomadorNome: form.tomadorNome || customer?.legal_name,\n          tomadorDocumento: form.tomadorDocumento || customer?.tax_id,\n          tomadorInscricaoMunicipal: form.tomadorInscricaoMunicipal || customer?.municipal_registration,\n          tomadorTelefone: form.tomadorTelefone || customer?.phone || customer?.mobile,\n          tomadorEmail: form.tomadorEmail || customer?.email,\n          tomadorCep: form.tomadorCep || customer?.postal_code,\n          tomadorMunicipio: form.tomadorMunicipio || customer?.city,\n          tomadorUf: form.tomadorUf || customer?.state,\n          tomadorMunicipioIbge: form.tomadorMunicipioIbge || customer?.city_ibge_code,\n          tomadorEndereco: [form.tomadorLogradouro || customer?.street, form.tomadorNumero || customer?.street_number, form.tomadorComplemento || customer?.complement, form.tomadorBairro || customer?.district].filter(Boolean).join(', '),")
s = s.replace("          codigoTributacaoMunicipal: service?.service_code_municipal,\n          nbsCode: digits(form.nbsCode),\n          informacoesComplementares: service?.fiscal_notes || '',",
"          codigoTributacaoMunicipal: form.serviceCodeMunicipal || service?.service_code_municipal,\n          nbsCode: digits(form.nbsCode),\n          informacoesComplementares: form.informacoesComplementares || service?.fiscal_notes || '',")
s = s.replace("<div><dt>{documentType === 'NFS-e' ? 'Serviço' : documentType === 'CT-e' || documentType === 'MDF-e' ? 'Trajeto' : 'Produto'}</dt><dd>{(documentType === 'NFS-e' ? service?.name :", "<div><dt>{documentType === 'NFS-e' ? 'Serviço' : documentType === 'CT-e' || documentType === 'MDF-e' ? 'Trajeto' : 'Produto'}</dt><dd>{(documentType === 'NFS-e' ? (form.description || service?.name) :")
p.write_text(s)

# 3) Backend: stop injecting unsupported XML fragments. Preserve values in payload; block issue when unsupported fields would make official XML incomplete.
p = Path('supabase/functions/saas-nfse-issue/index.ts')
s = p.read_text()
old = '''    const deducao=Number(raw.deducaoReducao||0);if(deducao>0){const marker="</vDescCondIncond>";const dedXml=`<vDedRed><vDR>${deducao.toFixed(2)}</vDR></vDedRed>`;if(xmlBeforeSign.includes(marker))xmlBeforeSign=xmlBeforeSign.replace(marker,marker+dedXml);else xmlBeforeSign=xmlBeforeSign.replace("</vServPrest>","</vServPrest>"+dedXml);}\n    const infoCompl=String(raw.informacoesComplementares||"").trim();if(infoCompl){const esc=infoCompl.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\\\"/g,"&quot;");xmlBeforeSign=xmlBeforeSign.replace("</serv>",`<infoCompl><xInfComp>${esc}</xInfComp></infoCompl></serv>`);}\n'''
new = '''    const deducao=Number(raw.deducaoReducao||0),infoCompl=String(raw.informacoesComplementares||"").trim();\n    if(action==="issue"&&deducao>0)return out({error:"Campo ainda não suportado com segurança",errors:["Dedução/Redução exige grupo oficial específico do layout nacional; a emissão foi bloqueada para não gerar XML inválido."]},422);\n    if(action==="issue"&&infoCompl)return out({error:"Campo ainda não suportado com segurança",errors:["Informações complementares ainda não possuem mapeamento seguro no SDK atual; a emissão foi bloqueada para não inserir tag fora do XSD."]},422);\n'''
if old not in s:
    raise SystemExit('backend unsafe XML block not found')
s = s.replace(old,new,1)
p.write_text(s)
print('final NFS-e official flow patch applied')
