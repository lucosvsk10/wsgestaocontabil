import type { ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import FiscalCodeField from './FiscalCodeField';
import FiscalRecordPicker from './FiscalRecordPicker';
import MunicipalityField from './MunicipalityField';
import '@/styles/nfse-official-flow.css';

const digits=(v:any)=>String(v??'').replace(/\D/g,'');
const money=(v:any)=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const formatTaxId=(value:any)=>{const raw=digits(value);if(raw.length===14)return raw.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,'$1.$2.$3/$4-$5');if(raw.length===11)return raw.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/,'$1.$2.$3-$4');return value||'—'};

function Field({label,value,onChange,type='text',required=false,wide=false,hint,placeholder}:{label:string;value:any;onChange:(v:string)=>void;type?:string;required?:boolean;wide?:boolean;hint?:string;placeholder?:string}){
 return <label className={wide?'nfse-wide':''}><span className="fe-label">{label}{required&&<b aria-hidden="true"> *</b>}</span><Input type={type} value={value??''} onChange={e=>onChange(e.target.value)} placeholder={placeholder} className="fe-input"/>{hint&&<small className="fe-field-hint">{hint}</small>}</label>
}
function Select({label,value,onChange,children,required=false,wide=false,hint}:{label:string;value:any;onChange:(v:string)=>void;children:ReactNode;required?:boolean;wide?:boolean;hint?:string}){
 return <label className={wide?'nfse-wide':''}><span className="fe-label">{label}{required&&<b aria-hidden="true"> *</b>}</span><select className="fe-select" value={value??''} onChange={e=>onChange(e.target.value)}>{children}</select>{hint&&<small className="fe-field-hint">{hint}</small>}</label>
}
function TextArea({label,value,onChange,required=false,rows=5,hint}:{label:string;value:any;onChange:(v:string)=>void;required?:boolean;rows?:number;hint?:string}){
 return <label className="nfse-wide"><span className="fe-label">{label}{required&&<b aria-hidden="true"> *</b>}</span><textarea className="fe-textarea" rows={rows} value={value??''} onChange={e=>onChange(e.target.value)}/>{hint&&<small className="fe-field-hint">{hint}</small>}</label>
}
function Group({title,subtitle,children}:{title:string;subtitle?:string;children:ReactNode}){return <section className="nfse-official-group"><header><h3>{title}</h3>{subtitle&&<p>{subtitle}</p>}</header><div className="nfse-official-grid">{children}</div></section>}
function Readonly({label,value}:{label:string;value:any}){return <div className="nfse-readonly"><span>{label}</span><strong>{value||'—'}</strong></div>}

type Props={
 step:number; form:any; setField:(key:string,value:any)=>void; setForm:any; profile:any; customers:any[]; services:any[]; customer:any; service:any;
 onOpenCadastro?:(section:'Clientes'|'Produtos'|'Serviços'|'Transportadoras')=>void; finalActions?:ReactNode; allIssues?:string[]; setTab?:(tab:string)=>void;
};

export default function NfseOfficialFlow({step,form,setField,setForm,profile,customers,services,customer,service,onOpenCadastro,finalActions,allIssues=[],setTab}:Props){
 const isMeEpp=String(profile?.tax_regime||'').toLowerCase()==='simples';
 const customerItems=customers.map(item=>({id:item.id,name:item.legal_name||item.trade_name||'Sem nome',identifier:formatTaxId(item.tax_id),location:[item.city,item.state].filter(Boolean).join('/'),contact:[item.email,item.phone].filter(Boolean).join(' · '),detail:item.trade_name}));
 const serviceItems=services.map(item=>({id:item.id,name:item.name,code:item.code,classification:item.service_code_national?`Tributação ${item.service_code_national}`:undefined,amount:item.sale_price==null?undefined:Number(item.sale_price),detail:item.description}));
 const municipalLabel:{[k:string]:string}={1:'Operação Tributável',2:'Imunidade',3:'Exportação de serviço',4:'Não incidência'};
 const federalLabel:{[k:string]:string}={'00':'Nenhum','01':'PIS/COFINS tributáveis','02':'PIS/COFINS com retenção','03':'Retenções federais informadas'};
 const totalRet=[form.issRetido?Number(form.issValor||0):0,form.pisValor,form.cofinsValor,form.csllValor,form.irrfValor,form.cppValor].reduce((s,v)=>s+Number(v||0),0);
 const liquid=Math.max(0,Number(form.value||0)-Number(form.descontoIncondicionado||0)-Number(form.descontoCondicionado||0)-totalRet);

 if(step===0)return <div className="nfse-official-step">
  <div className="nfse-official-title"><p>PASSO 1</p><h2>Pessoas</h2><span>Informações gerais, emitente, tomador e intermediário conforme o Emissor Nacional.</span></div>
  <Group title="Informações Gerais">
   <Field label="Data de Competência" type="date" value={form.competencia} onChange={v=>setField('competencia',v)} required/>
   <Select label="Preencher as informações IBS/CBS" value={form.preencherIbsCbs} onChange={v=>setField('preencherIbsCbs',v)} required><option value="nao">Não</option><option value="sim">Sim</option></Select>
  </Group>
  <Group title="Informações do Emitente" subtitle="Dados do cadastro fiscal da empresa ativa. Estes dados não são copiados de outra empresa.">
   <Readonly label="Você irá emitir esta NFS-e como" value="PRESTADOR/FORNECEDOR"/><Readonly label="CNPJ" value={formatTaxId(profile?.tax_id)}/><Readonly label="Indicador Municipal" value={profile?.municipal_registration}/><Readonly label="Nome/Razão Social" value={profile?.legal_name}/><Readonly label="Telefone" value={profile?.phone}/><Readonly label="E-mail" value={profile?.email}/><Readonly label="Município" value={[profile?.city,profile?.state].filter(Boolean).join('/')}/>
   <Readonly label="Opção no Simples Nacional" value={isMeEpp?'Optante - Microempresa ou Empresa de Pequeno Porte (ME/EPP)':profile?.tax_regime==='mei'?'Optante - MEI':'Não optante'}/>
   {isMeEpp&&<Select wide required label="Regime de Apuração dos Tributos no Simples Nacional" value={form.regApTribSN} onChange={v=>setField('regApTribSN',v)}>
    <option value="">Selecione...</option><option value="1">Regime de apuração dos tributos federais e municipal pelo Simples Nacional</option><option value="2">Regime de apuração dos tributos federais pelo Simples Nacional e o ISSQN pela NFS-e conforme respectiva legislação municipal do tributo</option><option value="3">Regime de apuração dos tributos federais e municipal pela NFS-e conforme respectivas legislações federal e municipal de cada tributo</option>
   </Select>}
   <Select label="É uma compra governamental?" value={form.compraGovernamental} onChange={v=>setField('compraGovernamental',v)}><option value="nao">Não</option><option value="sim">Sim</option></Select>
   {form.compraGovernamental==='sim'&&<><Field label="Identificação do ente público" value={form.entePublicoDocumento} onChange={v=>setField('entePublicoDocumento',v)} required/><Field label="Nome do ente público" value={form.entePublicoNome} onChange={v=>setField('entePublicoNome',v)} required/></>}
  </Group>
  <Group title="Tomador/Adquirente do Serviço" subtitle="Selecione um cadastro para preencher automaticamente ou ajuste somente os dados desta emissão.">
   <div className="nfse-wide"><FiscalRecordPicker label="Cliente / tomador cadastrado" value={form.customerId} items={customerItems} onChange={v=>setField('customerId',v)} onCreate={()=>onOpenCadastro?.('Clientes')} required/></div>
   <Select label="Onde está localizado o estabelecimento/domicílio?" value={form.tomadorPais} onChange={v=>setField('tomadorPais',v)} required><option value="BR">Brasil</option><option value="EX">Exterior</option></Select>
   <Field label={form.tomadorPais==='BR'?'CNPJ/CPF':'NIF'} value={form.tomadorDocumento} onChange={v=>setField('tomadorDocumento',v)} required/>
   <Field label="Nome/Razão Social" value={form.tomadorNome} onChange={v=>setField('tomadorNome',v)} required/>
   <Field label="Indicador Municipal / Inscrição" value={form.tomadorInscricaoMunicipal} onChange={v=>setField('tomadorInscricaoMunicipal',v)}/>
   <Field label="CEP" value={form.tomadorCep} onChange={v=>setField('tomadorCep',v)}/>
   {form.tomadorPais==='BR'&&<div className="nfse-wide"><MunicipalityField label="Município" value={form.tomadorMunicipioIbge} name={form.tomadorMunicipio} state={form.tomadorUf} onChange={city=>setForm((p:any)=>({...p,tomadorMunicipioIbge:city.code,tomadorMunicipio:city.name,tomadorUf:city.state}))}/></div>}
   <Field label="Bairro" value={form.tomadorBairro} onChange={v=>setField('tomadorBairro',v)}/><Field label="Logradouro" value={form.tomadorLogradouro} onChange={v=>setField('tomadorLogradouro',v)}/><Field label="Número" value={form.tomadorNumero} onChange={v=>setField('tomadorNumero',v)}/><Field label="Complemento" value={form.tomadorComplemento} onChange={v=>setField('tomadorComplemento',v)}/><Field label="Telefone" value={form.tomadorTelefone} onChange={v=>setField('tomadorTelefone',v)}/><Field label="E-mail" value={form.tomadorEmail} onChange={v=>setField('tomadorEmail',v)} type="email"/>
  </Group>
  <Group title="Intermediário do Serviço">
   <Select label="Existe intermediário nesta operação?" value={form.temIntermediario} onChange={v=>setField('temIntermediario',v)}><option value="nao">Não</option><option value="sim">Sim</option></Select>
   {form.temIntermediario==='sim'&&<><Field label="CNPJ/CPF/NIF do intermediário" value={form.intermediarioDocumento} onChange={v=>setField('intermediarioDocumento',v)} required/><Field label="Nome/Razão Social do intermediário" value={form.intermediarioNome} onChange={v=>setField('intermediarioNome',v)} required/><Field label="Inscrição Municipal do intermediário" value={form.intermediarioIM} onChange={v=>setField('intermediarioIM',v)}/></>}
  </Group>
 </div>;

 if(step===1)return <div className="nfse-official-step">
  <div className="nfse-official-title"><p>PASSO 2</p><h2>Serviço</h2><span>Classificação, NBS, locais e descrição do fornecimento.</span></div>
  <Group title="Serviço Prestado">
   <div className="nfse-wide"><FiscalRecordPicker label="Serviço cadastrado" value={form.serviceId} items={serviceItems} onChange={v=>setField('serviceId',v)} onCreate={()=>onOpenCadastro?.('Serviços')} required/></div>
   <FiscalCodeField kind="service" label="Código completo do serviço / Código de Tributação Nacional" value={form.serviceCode} onChange={v=>setField('serviceCode',v)} required onResolved={record=>{if(!String(form.description||'').trim())setField('description',record.description)}}/>
   <Field label="Código de Tributação Municipal" value={form.serviceCodeMunicipal} onChange={v=>setField('serviceCodeMunicipal',v)}/>
   <FiscalCodeField kind="nbs" label="Item da NBS correspondente ao serviço/fornecimento prestado" value={form.nbsCode} onChange={v=>setField('nbsCode',v)} required/>
   <div className="nfse-wide"><MunicipalityField label="Local do Fornecimento/Prestação do Serviço" value={form.municipioPrestacao} name={form.municipioPrestacaoNome} state={form.municipioPrestacaoUf} onChange={city=>setForm((p:any)=>({...p,municipioPrestacao:city.code,municipioPrestacaoNome:city.name,municipioPrestacaoUf:city.state}))}/></div>
   <div className="nfse-wide"><MunicipalityField label="Local de Incidência do ISSQN" value={form.municipioIncidencia} name={form.municipioIncidenciaNome} state={form.municipioIncidenciaUf} onChange={city=>setForm((p:any)=>({...p,municipioIncidencia:city.code,municipioIncidenciaNome:city.name,municipioIncidenciaUf:city.state}))}/></div>
   <TextArea label="Descrição do Serviço/Fornecimento" value={form.description} onChange={v=>setField('description',v)} required rows={8}/>
  </Group>
  <Group title="Informações Complementares"><TextArea label="Informações complementares" value={form.informacoesComplementares} onChange={v=>setField('informacoesComplementares',v)} rows={5}/></Group>
  <details className="fe-emission-details nfse-wide"><summary>Detalhes avançados · série {form.series} · nº {form.number}</summary><div className="nfse-official-grid"><Field label="Série DPS" value={form.series} onChange={v=>setField('series',v)} required/><Field label="Número DPS" type="number" value={form.number} onChange={v=>setField('number',v)} required/></div></details>
 </div>;

 if(step===2)return <div className="nfse-official-step">
  <div className="nfse-official-title"><p>PASSO 3</p><h2>Valores</h2><span>Valores do serviço e tributação municipal, federal e IBS/CBS.</span></div>
  <Group title="Valores do Serviço Prestado">
   <Field label="Valor da operação/serviço prestado" type="number" value={form.value} onChange={v=>setField('value',v)} required/><Field label="Desconto incondicionado" type="number" value={form.descontoIncondicionado} onChange={v=>setField('descontoIncondicionado',v)}/><Field label="Desconto condicionado" type="number" value={form.descontoCondicionado} onChange={v=>setField('descontoCondicionado',v)}/><Field label="Dedução/Redução da base" type="number" value={form.deducaoReducao} onChange={v=>setField('deducaoReducao',v)}/>
  </Group>
  <Group title="Tributação Municipal">
   <Select label="Tributação do ISSQN sobre o serviço prestado" value={form.tributacaoIss} onChange={v=>setField('tributacaoIss',v)} required><option value="1">Operação Tributável</option><option value="2">Imunidade</option><option value="3">Exportação de serviço</option><option value="4">Não incidência</option></Select>
   <Select label="Regime Especial de Tributação" value={form.regimeEspecial} onChange={v=>setField('regimeEspecial',v)}><option value="0">Nenhum</option><option value="1">Microempresa municipal</option><option value="2">Estimativa</option><option value="3">Sociedade de profissionais</option><option value="4">Cooperativa</option><option value="5">MEI</option><option value="6">ME/EPP</option></Select>
   <Select label="A exigibilidade do recolhimento do ISSQN devido nesta operação está suspensa?" value={form.issSuspenso} onChange={v=>setField('issSuspenso',v)}><option value="nao">Não</option><option value="sim">Sim</option></Select>
   {form.issSuspenso==='sim'&&<><Field label="Número do processo" value={form.processoSuspensao} onChange={v=>setField('processoSuspensao',v)} required/><Field label="Motivo da suspensão" value={form.motivoSuspensao} onChange={v=>setField('motivoSuspensao',v)} required/></>}
   <Select label="Há retenção do ISSQN pelo Tomador ou pelo Intermediário?" value={form.issRetido?'sim':'nao'} onChange={v=>setField('issRetido',v==='sim')}><option value="nao">Não</option><option value="sim">Sim</option></Select>
   <Select label="Este serviço prestado está amparado por algum benefício municipal?" value={form.beneficioMunicipal} onChange={v=>setField('beneficioMunicipal',v)}><option value="nao">Não</option><option value="sim">Sim</option></Select>
   {form.beneficioMunicipal==='sim'&&<Field label="Identificação/descrição do benefício municipal" value={form.beneficioMunicipalInfo} onChange={v=>setField('beneficioMunicipalInfo',v)} required/>}
   <Select label="Será aplicado algum tipo de Dedução/Redução à base de cálculo do ISSQN?" value={form.aplicarDeducao} onChange={v=>setField('aplicarDeducao',v)}><option value="nao">Não</option><option value="sim">Sim</option></Select>
   {form.regApTribSN!=='1'&&<Field label="Alíquota do ISSQN (%)" type="number" value={form.issAliquota} onChange={v=>setField('issAliquota',v)}/>} 
  </Group>
  <Group title="Tributação Federal">
   <Select label="Situação Tributária do PIS/COFINS/CSLL" value={form.federalSituacao} onChange={v=>setField('federalSituacao',v)}><option value="00">00 - Nenhum</option><option value="01">01 - PIS/COFINS tributáveis</option><option value="02">02 - PIS/COFINS com retenção</option><option value="03">03 - Retenções federais informadas</option></Select>
   <Select label="PIS/COFINS retidos?" value={form.tpRetPisCofins} onChange={v=>setField('tpRetPisCofins',v)}><option value="0">0 - Não retidos</option><option value="1">1 - Retidos</option></Select>
   {form.federalSituacao!=='00'&&<><Field label="Base PIS/COFINS" type="number" value={form.basePisCofins} onChange={v=>setField('basePisCofins',v)}/><Field label="Alíquota PIS (%)" type="number" value={form.pisAliquota} onChange={v=>setField('pisAliquota',v)}/><Field label="Valor PIS" type="number" value={form.pisValor} onChange={v=>setField('pisValor',v)}/><Field label="Alíquota COFINS (%)" type="number" value={form.cofinsAliquota} onChange={v=>setField('cofinsAliquota',v)}/><Field label="Valor COFINS" type="number" value={form.cofinsValor} onChange={v=>setField('cofinsValor',v)}/><Field label="IRRF retido" type="number" value={form.irrfValor} onChange={v=>setField('irrfValor',v)}/><Field label="CSLL retida" type="number" value={form.csllValor} onChange={v=>setField('csllValor',v)}/><Field label="Contribuição Previdenciária retida" type="number" value={form.cppValor} onChange={v=>setField('cppValor',v)}/></>}
  </Group>
  {isMeEpp&&<Group title="Simples Nacional"><Field label="Alíquota total do Simples Nacional (%)" type="number" value={form.simplesTaxRate} onChange={v=>setField('simplesTaxRate',v)} required hint="Usada em pTotTribSN. Para ME/EPP o sistema nunca envia indTotTrib."/></Group>}
  {form.preencherIbsCbs==='sim'&&<Group title="IBS/CBS" subtitle="Informações declaradas pelo emitente no padrão nacional vigente.">
   <FiscalCodeField kind="indop" label="Indicador da operação (cIndOp)" value={form.ibsCbsIndOp} onChange={v=>setField('ibsCbsIndOp',v)} required onResolved={record=>setField('ibsCbsIndOpDescricao',record.description)}/><Readonly label="Descrição do indicador da operação" value={form.ibsCbsIndOpDescricao}/><Select label="Operação favorecida ZFM/ALC (indZFMALC)" value={form.indZFMALC} onChange={v=>setField('indZFMALC',v)}><option value="0">0 - Não</option><option value="1">1 - Sim</option></Select><Readonly label="CST IBS/CBS" value={digits(form.ibsCbsClassTrib).slice(0,3)}/><Field label="Classificação tributária IBS/CBS (cClassTrib)" value={form.ibsCbsClassTrib} onChange={v=>setForm((p:any)=>({...p,ibsCbsClassTrib:digits(v),ibsCbsCst:digits(v).slice(0,3)}))} required hint="O CST é derivado automaticamente dos 3 primeiros dígitos da classificação tributária."/>
  </Group>}
 </div>;

 return <div className="nfse-official-step nfse-review">
  <div className="nfse-official-title"><p>PASSO 4</p><h2>Emitir NFS-e</h2><span>Revise a Declaração de Prestação de Serviço antes da transmissão.</span></div>
  <Group title="PESSOAS"><Readonly label="Data de Competência" value={form.competencia}/><Readonly label="Emitente" value={profile?.legal_name}/><Readonly label="CNPJ" value={formatTaxId(profile?.tax_id)}/><Readonly label="Indicador Municipal" value={profile?.municipal_registration}/><Readonly label="Tomador/Adquirente" value={form.tomadorNome||customer?.legal_name}/><Readonly label="Documento do tomador" value={formatTaxId(form.tomadorDocumento||customer?.tax_id)}/>{form.temIntermediario==='sim'&&<Readonly label="Intermediário" value={form.intermediarioNome}/>}<Button variant="outline" type="button" onClick={()=>setTab?.('Pessoas')}>Editar Pessoas</Button></Group>
  <Group title="SERVIÇO"><Readonly label="Código completo do serviço" value={form.serviceCode}/><Readonly label="Descrição do serviço" value={service?.name}/><Readonly label="Item da NBS" value={form.nbsCode}/><Readonly label="Local da Prestação" value={[form.municipioPrestacaoNome,form.municipioPrestacaoUf].filter(Boolean).join('/')}/><Readonly label="Local de Incidência do ISSQN" value={[form.municipioIncidenciaNome,form.municipioIncidenciaUf].filter(Boolean).join('/')}/><div className="nfse-wide"><Readonly label="Descrição do Serviço/Fornecimento" value={form.description}/></div><Button variant="outline" type="button" onClick={()=>setTab?.('Serviço')}>Editar Serviço</Button></Group>
  <Group title="VALORES"><Readonly label="Valor da operação/serviço prestado" value={money(form.value)}/><Readonly label="Tributação do ISSQN" value={municipalLabel[String(form.tributacaoIss||'1')]||form.tributacaoIss}/><Readonly label="Regime Especial de Tributação" value={form.regimeEspecial==='0'?'Nenhum':form.regimeEspecial}/><Readonly label="Retenção do ISSQN" value={form.issRetido?'Sim':'Não'}/><Readonly label="Situação PIS/COFINS/CSLL" value={federalLabel[String(form.federalSituacao||'00')]||form.federalSituacao}/>{form.preencherIbsCbs==='sim'&&<Readonly label="IBS/CBS" value={`${form.ibsCbsIndOp||'—'} · CST ${form.ibsCbsCst||'—'} · ${form.ibsCbsClassTrib||'—'}`}/>}<Button variant="outline" type="button" onClick={()=>setTab?.('Valores')}>Editar Valores</Button></Group>
  <section className="nfse-values-preview"><h3>PRÉVIA DOS VALORES DA NFS-e</h3><div><span>Serviço prestado</span><b>{money(form.value)}</b></div><div><span>Base de cálculo</span><b>{money(Math.max(0,Number(form.value||0)-Number(form.descontoIncondicionado||0)-Number(form.deducaoReducao||0)))}</b></div><div><span>Alíquota aplicada</span><b>{form.issAliquota?`${form.issAliquota}%`:'—'}</b></div><div><span>ISSQN</span><b>{money(form.issValor)}</b></div><div><span>PIS - Débito/Retenção</span><b>{money(form.pisValor)}</b></div><div><span>COFINS - Débito/Retenção</span><b>{money(form.cofinsValor)}</b></div><div><span>Imposto de Renda Retido na Fonte (IRRF)</span><b>{money(form.irrfValor)}</b></div><div><span>Contribuições Sociais - Retidas</span><b>{money(form.csllValor)}</b></div><div><span>Contribuição Previdenciária - Retida</span><b>{money(form.cppValor)}</b></div><div className="nfse-total"><span>Valor total de tributos retidos</span><b>{money(totalRet)}</b></div><div className="nfse-total"><span>Valor líquido da NFS-e</span><b>{money(liquid)}</b></div></section>
  {allIssues.length>0&&<div className="fe-step-alert" role="alert"><b>Dados pendentes</b><span>{[...new Set(allIssues)].join(', ')}.</span></div>}
  {finalActions}
 </div>;
}
