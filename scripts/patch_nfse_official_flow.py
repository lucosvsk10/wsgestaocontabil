from pathlib import Path
import re

p = Path('src/components/saas/SaasEmission.tsx')
s = p.read_text()

if "import NfseOfficialFlow from './NfseOfficialFlow';" not in s:
    s = s.replace("import FiscalCodeField from './FiscalCodeField';", "import FiscalCodeField from './FiscalCodeField';\nimport NfseOfficialFlow from './NfseOfficialFlow';")

s = s.replace("'NFS-e': ['Pessoas', 'Serviço', 'Revisão']", "'NFS-e': ['Pessoas', 'Serviço', 'Valores', 'Emitir NFS-e']")

if "competencia: ''" not in s:
    s = s.replace("  simplesTaxRate: '',\n  municipioPrestacao:", "  simplesTaxRate: '',\n  competencia: '',\n  preencherIbsCbs: 'nao',\n  regApTribSN: '1',\n  compraGovernamental: 'nao',\n  entePublicoDocumento: '',\n  entePublicoNome: '',\n  tomadorPais: 'BR',\n  tomadorDocumento: '',\n  tomadorNome: '',\n  tomadorInscricaoMunicipal: '',\n  tomadorTelefone: '',\n  tomadorEmail: '',\n  tomadorCep: '',\n  tomadorMunicipio: '',\n  tomadorUf: '',\n  tomadorMunicipioIbge: '',\n  tomadorBairro: '',\n  tomadorLogradouro: '',\n  tomadorNumero: '',\n  tomadorComplemento: '',\n  temIntermediario: 'nao',\n  intermediarioDocumento: '',\n  intermediarioNome: '',\n  intermediarioIM: '',\n  serviceCodeMunicipal: '',\n  municipioIncidencia: '',\n  municipioIncidenciaNome: '',\n  municipioIncidenciaUf: '',\n  informacoesComplementares: '',\n  descontoIncondicionado: '',\n  descontoCondicionado: '',\n  deducaoReducao: '',\n  tributacaoIss: '1',\n  regimeEspecial: '0',\n  issSuspenso: 'nao',\n  processoSuspensao: '',\n  motivoSuspensao: '',\n  issRetido: false,\n  beneficioMunicipal: 'nao',\n  beneficioMunicipalInfo: '',\n  aplicarDeducao: 'nao',\n  issAliquota: '',\n  issValor: '',\n  federalSituacao: '00',\n  tpRetPisCofins: '0',\n  basePisCofins: '',\n  pisAliquota: '',\n  pisValor: '',\n  cofinsAliquota: '',\n  cofinsValor: '',\n  irrfValor: '',\n  csllValor: '',\n  cppValor: '',\n  ibsCbsIndOp: '',\n  ibsCbsIndOpDescricao: '',\n  indZFMALC: '0',\n  ibsCbsCst: '',\n  ibsCbsClassTrib: '',\n  ibsCbsBase: '',\n  ibsReducao: '',\n  cbsReducao: '',\n  municipioPrestacao:")

old_service = """      if (k === 'serviceId') {
        const selected = services.find(item => item.id === v);
        if (selected) {
          next.value = String(selected.sale_price ?? '');
          next.description = selected.description || selected.name;
          next.serviceCode = selected.service_code_national || profile?.default_nfse_service_code || '';
          next.nbsCode = selected.nbs_code || '';
        }
      }
"""
new_service = """      if (k === 'customerId') {
        const selected = customers.find(item => item.id === v);
        if (selected) {
          next.tomadorPais = 'BR';
          next.tomadorDocumento = selected.tax_id || '';
          next.tomadorNome = selected.legal_name || selected.trade_name || '';
          next.tomadorInscricaoMunicipal = selected.municipal_registration || '';
          next.tomadorTelefone = selected.phone || selected.mobile || '';
          next.tomadorEmail = selected.email || '';
          next.tomadorCep = selected.postal_code || '';
          next.tomadorMunicipio = selected.city || '';
          next.tomadorUf = selected.state || '';
          next.tomadorMunicipioIbge = selected.city_ibge_code || '';
          next.tomadorBairro = selected.district || '';
          next.tomadorLogradouro = selected.street || '';
          next.tomadorNumero = selected.street_number || '';
          next.tomadorComplemento = selected.complement || '';
        }
      }
      if (k === 'serviceId') {
        const selected = services.find(item => item.id === v);
        if (selected) {
          next.value = String(selected.sale_price ?? '');
          next.description = selected.description || selected.name;
          next.serviceCode = selected.service_code_national || profile?.default_nfse_service_code || '';
          next.serviceCodeMunicipal = selected.service_code_municipal || '';
          next.nbsCode = selected.nbs_code || '';
          next.informacoesComplementares = selected.fiscal_notes || '';
          next.issRetido = Boolean(selected.iss_withheld);
          if (selected.iss_rate != null) next.issAliquota = String(selected.iss_rate);
        }
      }
"""
if old_service in s:
    s = s.replace(old_service, new_service, 1)

if "municipioIncidencia: savedDraft" not in s:
    s = s.replace("        municipioPrestacaoUf: savedDraft ? f.municipioPrestacaoUf : pp.state || '',", "        municipioPrestacaoUf: savedDraft ? f.municipioPrestacaoUf : pp.state || '',\n        municipioIncidencia: savedDraft ? f.municipioIncidencia : pp.city_ibge_code || '',\n        municipioIncidenciaNome: savedDraft ? f.municipioIncidenciaNome : pp.city || '',\n        municipioIncidenciaUf: savedDraft ? f.municipioIncidenciaUf : pp.state || '',\n        competencia: savedDraft ? f.competencia : new Date().toISOString().slice(0,10),")

s = s.replace("    const savedStep = documentType === 'NFS-e' && ['Valores', 'Impostos'].includes(savedDraft?.tab || '') ? 'Serviço' : savedDraft?.tab;", "    const savedStep = documentType === 'NFS-e' && savedDraft?.tab === 'Revisão' ? 'Emitir NFS-e' : documentType === 'NFS-e' && savedDraft?.tab === 'Impostos' ? 'Valores' : savedDraft?.tab;")

start = s.index('  const nfsePayload = () => ({')
end = s.index('\n  const partyCte =', start)
nfse = """  const nfsePayload = () => ({
    environment,
    serie: form.series,
    numero: form.number,
    competencia: form.competencia,
    municipioEmissor: profile?.city_ibge_code,
    municipioPrestacao: form.municipioPrestacao,
    municipioPrestacaoNome: form.municipioPrestacaoNome,
    municipioPrestacaoUf: form.municipioPrestacaoUf,
    municipioIncidencia: form.municipioIncidencia,
    municipioIncidenciaNome: form.municipioIncidenciaNome,
    municipioIncidenciaUf: form.municipioIncidenciaUf,
    codigoTributacao: form.serviceCode,
    codigoTributacaoMunicipal: form.serviceCodeMunicipal || service?.service_code_municipal || '',
    nbsCode: digits(form.nbsCode), nbs: digits(form.nbsCode),
    regApTribSN: form.regApTribSN,
    simplesTaxRate: form.simplesTaxRate === '' ? null : Number(form.simplesTaxRate),
    preencherIbsCbs: form.preencherIbsCbs === 'sim',
    compraGovernamental: form.compraGovernamental === 'sim',
    entePublicoDocumento: form.entePublicoDocumento,
    entePublicoNome: form.entePublicoNome,
    servicoNome: service?.name || '', descricao: form.description,
    informacoesComplementares: form.informacoesComplementares,
    valor: Number(form.value),
    descontoIncondicionado: Number(form.descontoIncondicionado || 0),
    descontoCondicionado: Number(form.descontoCondicionado || 0),
    deducaoReducao: Number(form.deducaoReducao || 0),
    tomadorPais: form.tomadorPais,
    tomadorDocumento: form.tomadorDocumento || customer?.tax_id || '',
    tomadorNome: form.tomadorNome || customer?.legal_name || '',
    tomadorInscricaoMunicipal: form.tomadorInscricaoMunicipal,
    tomadorTelefone: form.tomadorTelefone, tomadorEmail: form.tomadorEmail,
    tomadorCep: form.tomadorCep, tomadorMunicipio: form.tomadorMunicipio,
    tomadorUf: form.tomadorUf, tomadorMunicipioIbge: form.tomadorMunicipioIbge,
    tomadorBairro: form.tomadorBairro, tomadorLogradouro: form.tomadorLogradouro,
    tomadorNumero: form.tomadorNumero, tomadorComplemento: form.tomadorComplemento,
    temIntermediario: form.temIntermediario === 'sim',
    intermediarioDocumento: form.intermediarioDocumento,
    intermediarioNome: form.intermediarioNome, intermediarioIM: form.intermediarioIM,
    tributacaoIss: form.tributacaoIss, regimeEspecial: form.regimeEspecial,
    issSuspenso: form.issSuspenso === 'sim', processoSuspensao: form.processoSuspensao,
    motivoSuspensao: form.motivoSuspensao, issRetido: Boolean(form.issRetido),
    beneficioMunicipal: form.beneficioMunicipal === 'sim', beneficioMunicipalInfo: form.beneficioMunicipalInfo,
    aplicarDeducao: form.aplicarDeducao === 'sim',
    issAliquota: form.issAliquota === '' ? null : Number(form.issAliquota),
    federalSituacao: form.federalSituacao, tpRetPisCofins: form.tpRetPisCofins,
    basePisCofins: Number(form.basePisCofins || 0), pisAliquota: Number(form.pisAliquota || 0),
    pisValor: Number(form.pisValor || 0), cofinsAliquota: Number(form.cofinsAliquota || 0),
    cofinsValor: Number(form.cofinsValor || 0), irrfValor: Number(form.irrfValor || 0),
    csllValor: Number(form.csllValor || 0), cppValor: Number(form.cppValor || 0),
    ibsCbs: form.preencherIbsCbs === 'sim' ? {
      cIndOp: form.ibsCbsIndOp, xIndOp: form.ibsCbsIndOpDescricao, indZFMALC: form.indZFMALC,
      CST: form.ibsCbsCst, cClassTrib: form.ibsCbsClassTrib, vBC: Number(form.ibsCbsBase || 0),
      pRedIBS: Number(form.ibsReducao || 0), pRedCBS: Number(form.cbsReducao || 0),
    } : null,
  });"""
s = s[:start] + nfse + s[end:]

pattern = r"    if \(documentType === 'NFS-e'\) \{\n.*?\n    \}\n    if \(documentType === 'CT-e'\) \{"
repl = """    if (documentType === 'NFS-e') {
      if (index === 0) {
        need(String(form.competencia || '').trim(), 'data de competência');
        need(isValidTaxId(form.tomadorDocumento || customer?.tax_id), 'CPF/CNPJ válido do tomador');
        need(String(form.tomadorNome || customer?.legal_name || '').trim(), 'nome/razão social do tomador');
        if (profile?.tax_regime === 'simples') need(['1','2','3'].includes(String(form.regApTribSN)), 'regime de apuração do Simples Nacional');
        if (form.temIntermediario === 'sim') { need(String(form.intermediarioDocumento).trim(), 'documento do intermediário'); need(String(form.intermediarioNome).trim(), 'nome do intermediário'); }
      }
      if (index === 1) {
        need(service, 'serviço');
        need(/^\\d{6}$/.test(digits(form.serviceCode)), 'código de tributação nacional com 6 dígitos');
        need(/^\\d{9}$/.test(digits(form.nbsCode)), 'Código da NBS com 9 dígitos');
        need(digits(form.municipioPrestacao).length === 7, 'local da prestação (IBGE)');
        need(digits(form.municipioIncidencia).length === 7, 'local de incidência do ISSQN (IBGE)');
        need(String(form.description).trim(), 'descrição do serviço/fornecimento');
        need(isDocumentNumber(form.series, 5, true), 'série DPS numérica');
        need(isDocumentNumber(form.number, 15), 'número DPS');
      }
      if (index === 2) {
        need(isPositiveAmount(form.value), 'valor da operação/serviço');
        need(String(form.tributacaoIss || '').trim(), 'tributação do ISSQN');
        if (profile?.tax_regime === 'simples') {
          const simplesRate = Number(form.simplesTaxRate);
          need(Number.isFinite(simplesRate) && simplesRate > 0 && simplesRate <= 100, 'alíquota total do Simples Nacional (%)');
        }
        if (form.issSuspenso === 'sim') need(String(form.processoSuspensao).trim(), 'processo da suspensão do ISSQN');
        if (form.beneficioMunicipal === 'sim') need(String(form.beneficioMunicipalInfo).trim(), 'benefício municipal');
        if (form.preencherIbsCbs === 'sim') { need(String(form.ibsCbsIndOp).trim(), 'indicador da operação IBS/CBS'); need(String(form.ibsCbsCst).trim(), 'CST IBS/CBS'); need(String(form.ibsCbsClassTrib).trim(), 'classificação tributária IBS/CBS'); }
      }
    }
    if (documentType === 'CT-e') {"""
s, n = re.subn(pattern, repl, s, count=1, flags=re.S)
if n != 1:
    raise SystemExit('validation block not replaced')

start = s.index("  if (documentType === 'NFS-e')\n    content =")
end = s.index("\n  if (documentType === 'CT-e')", start)
s = s[:start] + """  if (documentType === 'NFS-e')
    content = <NfseOfficialFlow step={step} form={form} setField={set} setForm={setForm} profile={profile} customers={customers} services={services} customer={customer} service={service} onOpenCadastro={onOpenCadastro} />;""" + s[end:]

marker = """        {last ? (
          <div className=\"fe-review-layout\">"""
if marker not in s:
    raise SystemExit('review marker not found')
start = s.index(marker)
split = s.index("        ) : (\n          <main className=\"fe-step-page\">", start)
old = s[start:split]
generic = old[len("        {last ? (\n"):]
new = """        {last ? (
          documentType === 'NFS-e' ? (
            <div className=\"fe-review-layout\">
              <div>
                <NfseOfficialFlow step={3} form={form} setField={set} setForm={setForm} profile={profile} customers={customers} services={services} customer={customer} service={service} onOpenCadastro={onOpenCadastro} finalActions={finalActions} allIssues={allIssues} setTab={setTab} />
              </div>
              <FiscalPreview documentType={documentType} environment={environment} profile={profile} form={form} customer={customer} product={product} service={service} dest={dest} result={result} />
            </div>
          ) : (
""" + generic + "\n          )"
s = s[:start] + new + s[split:]

p.write_text(s)
print('patched', p)
