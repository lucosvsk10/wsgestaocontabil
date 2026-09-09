from pathlib import Path


def replace(path: str, old: str, new: str, expected: int | None = 1):
    p = Path(path)
    text = p.read_text()
    found = text.count(old)
    if found == 0:
        raise SystemExit(f"pattern not found in {path}: {old[:160]!r}")
    if expected is not None and found != expected:
        raise SystemExit(f"unexpected count {found} in {path}: {old[:160]!r}")
    p.write_text(text.replace(old, new))


# Account drawer: same typography as ADM and product-neutral copy.
replace(
    "src/components/account/AccountDrawer.tsx",
    '  notifications?: Array<{ title: string; text: string }>;\n};',
    '  notifications?: Array<{ title: string; text: string }>;\n  productName?: string;\n};',
)
replace(
    "src/components/account/AccountDrawer.tsx",
    '  avatarUrl = null,\n  notifications = [],\n}: AccountDrawerProps) {',
    '  avatarUrl = null,\n  notifications = [],\n  productName = "Sistema WS",\n}: AccountDrawerProps) {',
)
replace(
    "src/components/account/AccountDrawer.tsx",
    '  const isSaasAccount = accessLabel === "Assinante do emissor fiscal";\n',
    '  const isSaasAccount = accessLabel === "Assinante do emissor fiscal";\n  const resolvedProductName = isSaasAccount ? "Emissor fiscal" : productName;\n',
)
replace(
    "src/components/account/AccountDrawer.tsx",
    '                  subtitle={sectionMeta[section].subtitle}\n',
    '                  subtitle={section === "Configurações gerais" ? `Informações vinculadas ao seu acesso no ${resolvedProductName}.` : sectionMeta[section].subtitle}\n',
)
replace(
    "src/components/account/AccountDrawer.tsx",
    '                        <p>Dados básicos associados ao seu login e ao emissor fiscal.</p>',
    '                        <p>Dados básicos associados ao seu login e ao {resolvedProductName}.</p>',
)
replace(
    "src/components/account/AccountDrawer.tsx",
    '                        <TextCard title="Emissor fiscal">Acesso aos recursos de emissão e gestão fiscal da organização.</TextCard>\n                        <TextCard title="Documentos">Centralização dos documentos e informações vinculadas à conta.</TextCard>',
    '                        <TextCard title={resolvedProductName}>Acesso aos recursos contratados para esta conta.</TextCard>\n                        <TextCard title="Documentos">Centralização dos documentos e informações vinculadas à conta.</TextCard>',
)
replace(
    "src/components/account/AccountDrawer.tsx",
    "font-family: 'Proxima Nova', 'Inter', 'Helvetica Neue', Arial, sans-serif !important;",
    "font-family: 'Space Grotesk', 'Inter', system-ui, sans-serif !important;",
    expected=None,
)
replace(
    "src/components/account/AccountDrawer.tsx",
    "letter-spacing: 0 !important;",
    "letter-spacing: -0.005em !important;",
    expected=None,
)
replace(
    "src/components/account/AccountDrawer.tsx",
    "background: linear-gradient(180deg, #0a1422 0%, #07111d 100%);",
    "background: linear-gradient(180deg, #040b14 0%, #020817 100%);",
)

# Emissor: standard WS logo, administrator typography, deeper almost-black topbar.
replace(
    "src/pages/SaasApp.tsx",
    "const WS_LOGO = '/assets/ws-emissor-fiscal.png';",
    "const WS_LOGO = '/assets/ws-logo.png';",
)
replace(
    "src/pages/SaasApp.tsx",
    ".select('organization_id, organizations(id,name,slug)')",
    ".select('organization_id, organizations(id,name,slug,product_scope)')",
)
replace(
    "src/pages/SaasApp.tsx",
    ".filter((value: any) => Boolean(value?.id));",
    ".filter((value: any) => Boolean(value?.id) && value?.product_scope !== 'extractor');",
)
replace(
    "src/styles/saas-native-font.css",
    "/* SaaS typography — Mercado Pago inspired hierarchy. Loaded last on purpose. */",
    "/* SaaS typography — same family used by the administrator panel. Loaded last on purpose. */",
)
replace(
    "src/styles/saas-native-font.css",
    "font-family: 'Proxima Nova', 'Inter', 'Helvetica Neue', Arial, sans-serif !important;",
    "font-family: 'Space Grotesk', 'Inter', system-ui, sans-serif !important;",
)
replace(
    "src/styles/saas-native-font.css",
    "letter-spacing: 0 !important;",
    "letter-spacing: -0.005em !important;",
    expected=None,
)
replace(
    "src/styles/saas-native-font.css",
    "background: radial-gradient(circle at 50% -120%, rgba(62,104,154,.24), transparent 58%), linear-gradient(180deg,#0a1422 0%,#07111d 100%) !important;",
    "background: radial-gradient(circle at 50% -150%, rgba(46,80,112,.18), transparent 56%), linear-gradient(180deg,#040b14 0%,#020817 100%) !important;",
)

# Router: an extractor-only membership is not SaaS access.
replace(
    "src/AppRoutes.tsx",
    ".select('id')\n        .eq('user_id', user.id)\n        .eq('status', 'active')\n        .limit(1),",
    ".select('id, organizations(product_scope)')\n        .eq('user_id', user.id)\n        .eq('status', 'active'),",
)
replace(
    "src/AppRoutes.tsx",
    "        saas: !saasResult.error && Boolean(saasResult.data?.length),\n        extractor: !extractorResult.error && Boolean(extractorResult.data?.length),",
    "        saas: !saasResult.error && Boolean((saasResult.data || []).some((row: any) => {\n          const org = Array.isArray(row.organizations) ? row.organizations[0] : row.organizations;\n          return org?.product_scope !== 'extractor';\n        })),\n        extractor: !extractorResult.error && Boolean(extractorResult.data?.length),",
)

# Extractor app: shared account drawer, real monthly usage, rows clickable everywhere.
replace(
    "src/pages/FiscalExtractorApp.tsx",
    "import AnimatedExtractorIcon, { type ExtractorIconName } from '@/components/extractor/AnimatedExtractorIcon';\n",
    "import AnimatedExtractorIcon, { type ExtractorIconName } from '@/components/extractor/AnimatedExtractorIcon';\nimport AccountDrawer from '@/components/account/AccountDrawer';\n",
)
replace(
    "src/pages/FiscalExtractorApp.tsx",
    "type Notice={tone:'success'|'warning'|'error';text:string}|null;\n",
    "type Notice={tone:'success'|'warning'|'error';text:string}|null;\ntype UsageSnapshot={account_id?:string;plan_code?:string;period_start?:string;period_end?:string;xml_used?:number;xml_limit?:number;xml_remaining?:number;usage_percent?:number;documents?:number;pending_xml?:number;history?:Array<{month?:string;xml_used?:number;documents?:number;pending_xml?:number}>;latest_plan_request?:{id?:string;requested_limit?:number;status?:string;created_at?:string}|null};\n",
)
replace(
    "src/pages/FiscalExtractorApp.tsx",
    "const iso=(d:Date)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;\n",
    "const iso=(d:Date)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;\nconst nowMonthStart=()=>{const d=new Date();return new Date(d.getFullYear(),d.getMonth(),1)};\nconst nowMonthEnd=()=>{const d=new Date();return new Date(d.getFullYear(),d.getMonth()+1,0)};\n",
)
replace(
    "src/pages/FiscalExtractorApp.tsx",
    "const syncLabel=(v?:string|null)=>{const x=String(v||'').toLowerCase();if(['running','queued','reconciling','bootstrap_window','retrying'].includes(x))return'Sincronizando';if(['idle','completed','success'].includes(x))return'Ativa';if(!x)return'Não iniciada';return x.replaceAll('_',' ')};\n",
    "const syncLabel=(v?:string|null)=>{const x=String(v||'').toLowerCase();if(['running','queued','reconciling','bootstrap_window','retrying'].includes(x))return'Sincronizando';if(['idle','completed','success'].includes(x))return'Ativa';if(!x)return'Não iniciada';return x.replaceAll('_',' ')};\nconst extractorPlanLabel=(account:any)=>account?.plan_code==='lifetime_test'?'Teste vitalício':account?.plan_code==='office_20000'?`Escritório · ${integer.format(Number(account?.monthly_xml_limit||account?.xml_limit||20000))} XML/mês`:String(account?.plan_code||'Plano Extrator');\n",
)
replace(
    "src/pages/FiscalExtractorApp.tsx",
    " const [active,setActive]=useState<Section>('Visão geral'),[mobile,setMobile]=useState(false),[snapshot,setSnapshot]=useState<Snapshot|null>(null),[loading,setLoading]=useState(!preview),[denied,setDenied]=useState(false),[notice,setNotice]=useState<Notice>(null),[companyModal,setCompanyModal]=useState(false),[selectedCompanyId,setSelectedCompanyId]=useState<string>(''),[previewDoc,setPreviewDoc]=useState<PreviewDocument|null>(null);\n const load=useCallback(async(quiet=false)=>{if(preview||!user)return;if(!quiet)setLoading(true);const{data,error}=await(supabase as any).rpc('extractor_workspace_snapshot');if(error||!data){setDenied(true)}else{setSnapshot(data as Snapshot);setDenied(false)}if(!quiet)setLoading(false)},[preview,user?.id]);",
    " const [active,setActive]=useState<Section>('Visão geral'),[mobile,setMobile]=useState(false),[snapshot,setSnapshot]=useState<Snapshot|null>(null),[usage,setUsage]=useState<UsageSnapshot|null>(null),[loading,setLoading]=useState(!preview),[denied,setDenied]=useState(false),[notice,setNotice]=useState<Notice>(null),[companyModal,setCompanyModal]=useState(false),[selectedCompanyId,setSelectedCompanyId]=useState<string>(''),[previewDoc,setPreviewDoc]=useState<PreviewDocument|null>(null);\n const load=useCallback(async(quiet=false)=>{if(preview||!user)return;if(!quiet)setLoading(true);const[workspaceResult,usageResult]=await Promise.all([(supabase as any).rpc('extractor_workspace_snapshot'),(supabase as any).rpc('extractor_usage_snapshot')]);const{data,error}=workspaceResult;if(error||!data){setDenied(true)}else{setSnapshot(data as Snapshot);setDenied(false);if(!usageResult.error&&usageResult.data)setUsage(usageResult.data as UsageSnapshot)}if(!quiet)setLoading(false)},[preview,user?.id]);",
)
replace(
    "src/pages/FiscalExtractorApp.tsx",
    " const daily=preview?Array.from({length:30},(_,i)=>({day:iso(new Date(Date.now()-(29-i)*86400000)),documents:[7,9,6,12,8,4,11,13,8,10][i%10]})):(snapshot?.daily||[]).map(x=>({day:String(x.day||''),documents:Number(x.documents||0)}));\n const go=(s:Section,companyId?:string)=>{if(companyId)setSelectedCompanyId(companyId);setActive(s);setMobile(false);setNotice(null)};",
    " const daily=preview?Array.from({length:30},(_,i)=>({day:iso(new Date(Date.now()-(29-i)*86400000)),documents:[7,9,6,12,8,4,11,13,8,10][i%10]})):(snapshot?.daily||[]).map(x=>({day:String(x.day||''),documents:Number(x.documents||0)}));\n const usageData:UsageSnapshot=preview?{plan_code:'demo',period_start:iso(nowMonthStart()),period_end:iso(nowMonthEnd()),xml_used:266,xml_limit:20000,xml_remaining:19734,usage_percent:1.33,documents:326,pending_xml:60,history:[]}:usage||{};\n const planName=extractorPlanLabel(snapshot?.account||usageData);\n const go=(s:Section,companyId?:string)=>{if(companyId)setSelectedCompanyId(companyId);setActive(s);setMobile(false);setNotice(null)};",
)
old_header = '''  <header className="extractor-topbar"><div className="extractor-brand"><button className="extractor-mobile-trigger" onClick={()=>setMobile(true)} aria-label="Abrir menu"><Menu/></button><img src="/assets/ws-extrator-fiscal.png" alt="WS Extrator Fiscal"/></div><div className="extractor-workspace"><small>Carteira fiscal</small><strong>{preview?'Demonstração':snapshot?.account?.name||'WS Gestão Contábil'}</strong></div><div className="extractor-account"><span>{preview?'PR':(user?.email||'WS').slice(0,2).toUpperCase()}</span></div></header>'''
new_header = '''  <header className="extractor-topbar"><div className="extractor-brand"><button className="extractor-mobile-trigger" onClick={()=>setMobile(true)} aria-label="Abrir menu"><Menu/></button><img src="/assets/ws-logo.png" alt="WS Gestão Contábil"/></div><div className="extractor-workspace"><small>Conta do Extrator</small><strong>{preview?'Demonstração':snapshot?.account?.name||'WS Gestão Contábil'}</strong></div><div className="extractor-account">{preview?<span>PR</span>:<AccountDrawer darkTrigger productName="Extrator Fiscal" accessLabel="Assinante do Extrator Fiscal" planLabel={planName} triggerClassName="extractor-account-trigger" usageRows={[{label:'XML processados no ciclo',value:integer.format(Number(usageData.xml_used||0))},{label:'XML restantes no plano',value:integer.format(Number(usageData.xml_remaining||0))},{label:'Empresas no Extrator',value:String(companies.length)}]} notifications={[{title:'Uso do plano',text:`${integer.format(Number(usageData.xml_used||0))} de ${integer.format(Number(usageData.xml_limit||snapshot?.account?.monthly_xml_limit||0))} XML utilizados no ciclo atual.`},{title:'Carteira do Extrator',text:`${companies.length} empresa(s) vinculada(s) exclusivamente a este produto.`}]}/>}</div></header>'''
replace("src/pages/FiscalExtractorApp.tsx", old_header, new_header)
replace(
    "src/pages/FiscalExtractorApp.tsx",
    '<div className="extractor-usage"><small>Documentos na janela</small><strong>{integer.format(totals.documents)}</strong><span>{snapshot?.account?.monthly_xml_limit?`Plano: ${integer.format(snapshot.account.monthly_xml_limit)} XML`:\'Janela fiscal ativa\'}</span></div>',
    '<button type="button" className="extractor-usage" onClick={()=>go(\'Configurações\')}><small>Uso do plano</small><strong>{integer.format(Number(usageData.xml_used||0))}<b> / {integer.format(Number(usageData.xml_limit||snapshot?.account?.monthly_xml_limit||0))}</b></strong><span>{integer.format(Number(usageData.xml_remaining||0))} XML restantes</span><em>Ver histórico e plano →</em></button>',
)
replace(
    "src/pages/FiscalExtractorApp.tsx",
    "   {active==='Configurações'&&<SettingsSection companies={companies} account={snapshot?.account}/>} ",
    "   {active==='Configurações'&&<SettingsSection companies={companies} account={snapshot?.account} usage={usageData} preview={preview} setNotice={setNotice} onReload={()=>load(true)}/>} ",
)
replace(
    "src/pages/FiscalExtractorApp.tsx",
    '''{visible.map((c:Company)=><div className="extractor-company-row" key={c.id}><div><strong>{c.tradeName}</strong><span>{formatCnpj(c.cnpj)} · {c.uf}</span></div><div><strong>{integer.format(c.documents)}</strong><span>{c.entries} compras · {c.exits} vendas</span></div><div><strong>{integer.format(c.fullXml)}</strong><span>{c.pendingXml?`${c.pendingXml} pendente(s)`:'Completo no período'}</span></div><div><strong>{syncLabel(c.purchaseStatus)} / {syncLabel(c.salesStatus)}</strong><span>{c.lastSync?formatDate(c.lastSync,true):'Ainda não concluída'}</span></div><div><strong>{c.certificateUntil?formatDate(c.certificateUntil):'Não configurado'}</strong><span>{c.certificateDays==null?'—':`${c.certificateDays} dia(s)`}</span></div><div className="extractor-row-actions"><button onClick={()=>void sync(c)} disabled={busy===c.id}><AnimatedExtractorIcon name="refresh"/>{busy===c.id?'Atualizando':'Atualizar'}</button><button onClick={()=>onOpen(c.id)}>Notas</button></div></div>)}''',
    '''{visible.map((c:Company)=><div className="extractor-company-row" key={c.id} role="button" tabIndex={0} onClick={()=>onOpen(c.id)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onOpen(c.id)}}}><div><strong>{c.tradeName}</strong><span>{formatCnpj(c.cnpj)} · {c.uf}</span></div><div><strong>{integer.format(c.documents)}</strong><span>{c.entries} compras · {c.exits} vendas</span></div><div><strong>{integer.format(c.fullXml)}</strong><span>{c.pendingXml?`${c.pendingXml} pendente(s)`:'Completo no período'}</span></div><div><strong>{syncLabel(c.purchaseStatus)} / {syncLabel(c.salesStatus)}</strong><span>{c.lastSync?formatDate(c.lastSync,true):'Ainda não concluída'}</span></div><div><strong>{c.certificateUntil?formatDate(c.certificateUntil):'Não configurado'}</strong><span>{c.certificateDays==null?'—':`${c.certificateDays} dia(s)`}</span></div><div className="extractor-row-actions"><button onClick={e=>{e.stopPropagation();void sync(c)}} disabled={busy===c.id}><AnimatedExtractorIcon name="refresh"/>{busy===c.id?'Atualizando':'Atualizar'}</button><button onClick={e=>{e.stopPropagation();onOpen(c.id)}}>Notas</button></div></div>)}''',
)
replace(
    "src/pages/FiscalExtractorApp.tsx",
    '''return <tr key={`${d.accessKey||d.nsu||i}-${i}`} className={`ws-zebra-row ${cancelled(d)?'ws-zebra-cancelled':''}`} onClick={()=>void open(d)}>''',
    '''return <tr key={`${d.accessKey||d.nsu||i}-${i}`} className={`ws-zebra-row ${cancelled(d)?'ws-zebra-cancelled':''}`} role="button" tabIndex={0} onClick={()=>void open(d)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();void open(d)}}}>''',
)
replace(
    "src/pages/FiscalExtractorApp.tsx",
    '''function Certificates({companies,onGo}:any){return <div className="extractor-page"><PageHeading title="Certificados" icon="certificate" description="A1 utilizado nas consultas fiscais das empresas adicionadas ao Extrator."/><div className="extractor-company-list"><div className="extractor-company-head certificate"><span>Empresa</span><span>Validade</span><span>Dias restantes</span><span>Situação</span><span>Ação</span></div>{companies.map((c:Company)=>{const state=c.certificateDays==null?'Não configurado':c.certificateDays<0?'Vencido':c.certificateDays<=30?'Atenção':'Válido';return <div className="extractor-certificate-row" key={c.id}><div><strong>{c.tradeName}</strong><span>{formatCnpj(c.cnpj)}</span></div><span>{c.certificateUntil?formatDate(c.certificateUntil):'—'}</span><span>{c.certificateDays==null?'—':`${c.certificateDays} dia(s)`}</span><StatusTag value={state}/><button onClick={()=>onGo('Empresas')}>Gerenciar</button></div>})}{!companies.length&&<Empty>Nenhuma empresa adicionada.</Empty>}</div></div>}''',
    '''function Certificates({companies,onGo}:any){return <div className="extractor-page"><PageHeading title="Certificados" icon="certificate" description="A1 utilizado nas consultas fiscais das empresas adicionadas ao Extrator."/><div className="extractor-company-list"><div className="extractor-company-head certificate"><span>Empresa</span><span>Validade</span><span>Dias restantes</span><span>Situação</span><span>Ação</span></div>{companies.map((c:Company)=>{const state=c.certificateDays==null?'Não configurado':c.certificateDays<0?'Vencido':c.certificateDays<=30?'Atenção':'Válido';return <div className="extractor-certificate-row" key={c.id} role="button" tabIndex={0} onClick={()=>onGo('Empresas',c.id)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onGo('Empresas',c.id)}}><div><strong>{c.tradeName}</strong><span>{formatCnpj(c.cnpj)}</span></div><span>{c.certificateUntil?formatDate(c.certificateUntil):'—'}</span><span>{c.certificateDays==null?'—':`${c.certificateDays} dia(s)`}</span><StatusTag value={state}/><button onClick={e=>{e.stopPropagation();onGo('Empresas',c.id)}}>Gerenciar</button></div>})}{!companies.length&&<Empty>Nenhuma empresa adicionada.</Empty>}</div></div>}''',
)
old_settings = '''function SettingsSection({companies,account}:any){return <div className="extractor-page"><PageHeading title="Configurações" icon="settings" description="Parâmetros da carteira contratada."/><div className="extractor-settings-grid"><article className="extractor-panel"><PanelHead title="Plano e janela fiscal" sub="Configuração atual" icon="settings"/><dl><div><dt>Plano</dt><dd>{account?.plan_code||'—'}</dd></div><div><dt>Janela padrão</dt><dd>{account?.base_lookback_days?`${account.base_lookback_days} dias`:'—'}</dd></div><div><dt>Limite mensal</dt><dd>{account?.monthly_xml_limit?`${integer.format(account.monthly_xml_limit)} XML`:'—'}</dd></div></dl></article><article className="extractor-panel"><PanelHead title="Rotinas por empresa" sub="Estado fiscal atual" icon="refresh"/><div className="extractor-settings-companies">{companies.map((c:Company)=><div key={c.id}><span><strong>{c.tradeName}</strong><small>{c.automaticSync?'Sincronização automática habilitada':'Sincronização automática desabilitada'}</small></span><span>Compras: {syncLabel(c.purchaseStatus)}<br/>Vendas: {syncLabel(c.salesStatus)}</span></div>)}</div></article></div></div>}'''
new_settings = '''function SettingsSection({companies,account,usage,preview,setNotice,onReload}:any){
 const[requested,setRequested]=useState(''),[busy,setBusy]=useState(false);
 const limit=Number(usage?.xml_limit||account?.monthly_xml_limit||0),used=Number(usage?.xml_used||0),remaining=Math.max(0,Number(usage?.xml_remaining??(limit-used))),percent=Math.max(0,Math.min(100,Number(usage?.usage_percent||(limit?used/limit*100:0)))),history=Array.isArray(usage?.history)?usage.history:[],latest=usage?.latest_plan_request||null;
 const requestUpgrade=async()=>{const target=Number(requested);if(!Number.isFinite(target)||target<=limit)return setNotice({tone:'warning',text:`Informe um limite maior que ${integer.format(limit)} XML.`});if(preview)return setNotice({tone:'warning',text:'A solicitação de upgrade fica disponível no ambiente autenticado.'});setBusy(true);const{data,error}=await(supabase as any).rpc('extractor_request_plan_upgrade',{_requested_limit:Math.trunc(target)});if(error||!data?.ok)setNotice({tone:'error',text:error?.message||data?.message||'Não foi possível registrar o upgrade.'});else{setNotice({tone:'success',text:'Solicitação de upgrade registrada. O histórico da conta já foi atualizado.'});setRequested('');await onReload()}setBusy(false)};
 const monthLabel=(value:string)=>{const d=new Date(`${value}-01T12:00:00`);return Number.isNaN(d.getTime())?value:d.toLocaleDateString('pt-BR',{month:'short',year:'numeric'})};
 return <div className="extractor-page extractor-settings-page"><PageHeading title="Configurações" icon="settings" description="Plano, consumo mensal, histórico e rotinas desta carteira do Extrator."/>
  <section className="extractor-plan-hero" data-extractor-icon-host><div className="extractor-plan-hero-head"><div><span>Plano atual</span><h2>{extractorPlanLabel(account||usage)}</h2><p>Ciclo {formatDate(usage?.period_start)} a {formatDate(usage?.period_end)}</p></div><b>Ativo</b></div><div className="extractor-plan-progress-copy"><strong>{integer.format(used)} XML processados</strong><span>{integer.format(remaining)} restantes de {integer.format(limit)}</span></div><div className="extractor-plan-progress"><i style={{width:`${percent}%`}}/></div><div className="extractor-plan-facts"><div><span>Uso do ciclo</span><strong>{percent.toLocaleString('pt-BR',{maximumFractionDigits:1})}%</strong></div><div><span>Documentos localizados</span><strong>{integer.format(Number(usage?.documents||0))}</strong></div><div><span>XML pendentes</span><strong>{integer.format(Number(usage?.pending_xml||0))}</strong></div><div><span>Empresas</span><strong>{integer.format(companies.length)}</strong></div></div></section>
  <div className="extractor-settings-grid extractor-settings-grid-large"><article className="extractor-panel extractor-usage-history-panel"><PanelHead title="Histórico de consumo" sub="Últimos seis ciclos mensais" icon="history"/><div className="extractor-usage-history">{history.length?history.map((h:any)=><div key={h.month}><span>{monthLabel(String(h.month||''))}</span><strong>{integer.format(Number(h.xml_used||0))} XML</strong><small>{integer.format(Number(h.documents||0))} documento(s) · {integer.format(Number(h.pending_xml||0))} pendente(s)</small></div>):<Empty>O histórico aparecerá conforme houver processamento.</Empty>}</div></article><article className="extractor-panel"><PanelHead title="Rotinas por empresa" sub="Estado fiscal atual" icon="refresh"/><div className="extractor-settings-companies">{companies.map((c:Company)=><div key={c.id}><span><strong>{c.tradeName}</strong><small>{c.automaticSync?'Sincronização automática habilitada':'Sincronização automática desabilitada'}</small></span><span>Compras: {syncLabel(c.purchaseStatus)}<br/>Vendas: {syncLabel(c.salesStatus)}</span></div>)}{!companies.length&&<Empty>Nenhuma empresa adicionada.</Empty>}</div></article></div>
  <article className="extractor-panel extractor-upgrade-panel"><PanelHead title="Limite e upgrade" sub="Aumente o volume sem misturar produtos ou empresas" icon="report"/><div className="extractor-upgrade-body"><div><h3>Precisa de um limite maior?</h3><p>Informe a quantidade mensal desejada. A solicitação fica registrada nesta conta do Extrator e não altera o plano automaticamente.</p>{latest?.status==='pending'&&<span className="extractor-upgrade-pending">Solicitação pendente: {integer.format(Number(latest.requested_limit||0))} XML/mês · {formatDate(latest.created_at,true)}</span>}</div><div className="extractor-upgrade-form"><label>Novo limite mensal<input type="number" min={limit+1} step="100" value={requested} onChange={e=>setRequested(e.target.value)} placeholder={`Acima de ${integer.format(limit)}`}/></label><button className="extractor-primary" onClick={()=>void requestUpgrade()} disabled={busy}>{busy?'Registrando...':'Solicitar upgrade'}</button></div></div></article>
 </div>
}'''
replace("src/pages/FiscalExtractorApp.tsx", old_settings, new_settings)
replace(
    "src/pages/FiscalExtractorApp.tsx",
    '''function Loading(){return <div className="extractor-loading"><img src="/assets/ws-extrator-fiscal.png" alt="WS Extrator Fiscal"/><span/><p>Carregando dados fiscais...</p></div>}\nfunction AccessPending(){return <div className="extractor-access-pending"><img src="/assets/ws-extrator-fiscal.png" alt="WS Extrator Fiscal"/><div><h1>Extrato Fiscal não habilitado</h1><p>Esta conta não possui acesso ativo ao produto.</p><a href="/extrator-preview">Abrir demonstração</a></div></div>}''',
    '''function Loading(){return <div className="extractor-loading"><img src="/assets/ws-logo.png" alt="WS Gestão Contábil"/><span/><p>Carregando dados fiscais...</p></div>}\nfunction AccessPending(){return <div className="extractor-access-pending"><img src="/assets/ws-logo.png" alt="WS Gestão Contábil"/><div><h1>Extrato Fiscal não habilitado</h1><p>Esta conta não possui acesso ativo ao produto.</p><a href="/extrator-preview">Abrir demonstração</a></div></div>}''',
)

# Animated icon component: host hover/focus triggers semantic animation.
Path("src/components/extractor/AnimatedExtractorIcon.tsx").write_text(r'''import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

export type ExtractorIconName = 'dashboard'|'company'|'document'|'report'|'certificate'|'history'|'settings'|'search'|'refresh'|'download'|'upload'|'eye'|'warning'|'check';
type Props={name:ExtractorIconName;className?:string;title?:string};

export default function AnimatedExtractorIcon({name,className='',title}:Props){
  const [hot,setHot]=useState(false);
  const ref=useRef<SVGSVGElement|null>(null);
  useEffect(()=>{
    const node=ref.current;if(!node)return;
    const host=node.closest('[data-extractor-icon-host],button,.extractor-metric,.extractor-panel,.extractor-company-row,.extractor-certificate-row,.extractor-usage') as HTMLElement|null;
    if(!host)return;
    const enter=()=>setHot(true),leave=()=>setHot(false),focus=()=>setHot(true),blur=()=>setHot(false);
    host.addEventListener('mouseenter',enter);host.addEventListener('mouseleave',leave);host.addEventListener('focusin',focus);host.addEventListener('focusout',blur);
    return()=>{host.removeEventListener('mouseenter',enter);host.removeEventListener('mouseleave',leave);host.removeEventListener('focusin',focus);host.removeEventListener('focusout',blur)};
  },[]);
  const common={fill:'none',stroke:'currentColor',strokeWidth:1.8,strokeLinecap:'round' as const,strokeLinejoin:'round' as const};
  const transition={duration:.42,ease:[.22,1,.36,1] as [number,number,number,number]};
  return <motion.svg ref={ref} viewBox="0 0 24 24" aria-hidden={title?undefined:true} role={title?'img':undefined} className={className} onMouseEnter={()=>setHot(true)} onMouseLeave={()=>setHot(false)} initial={false}>
    {title&&<title>{title}</title>}
    {name==='search'&&<><motion.circle cx="11" cy="11" r="6.6" {...common} animate={{rotate:hot?22:0,scale:hot?1.04:1}} style={{transformOrigin:'11px 11px'}} transition={transition}/><motion.path d="m16 16 4.1 4.1" {...common} animate={{x:hot?1:0,y:hot?1:0}} transition={transition}/></>}
    {name==='document'&&<><path d="M7 3.5h7l4 4V20H7z" {...common}/><path d="M14 3.5V8h4" {...common}/><motion.path d="M10 11h5.5" {...common} initial={{pathLength:1}} animate={{pathLength:hot?[0,1]:1}} transition={{duration:.55}}/><motion.path d="M10 14.5h5.5" {...common} initial={{pathLength:1}} animate={{pathLength:hot?[0,1]:1}} transition={{duration:.55,delay:hot ? .12 : 0}}/><motion.path d="M10 18h3.8" {...common} initial={{pathLength:1}} animate={{pathLength:hot?[0,1]:1}} transition={{duration:.5,delay:hot ? .22 : 0}}/></>}
    {name==='company'&&<><motion.path d="M4 20V8l8-4 8 4v12" {...common} animate={{y:hot?-.4:0}} transition={transition}/><path d="M8 20v-5h8v5" {...common}/>{[8,12,16].map((x,i)=><motion.rect key={x} x={x-1} y="9.5" width="2" height="2.2" rx=".35" {...common} animate={{opacity:hot?[.35,1,.35]:1,y:hot?[0,-.5,0]:0}} transition={{duration:.72,delay:i*.09}}/>)}</>}
    {name==='report'&&<><path d="M4 20h16" {...common}/><motion.path d="M7 17v-5" {...common} animate={{scaleY:hot?1.5:1}} style={{transformOrigin:'7px 17px'}} transition={transition}/><motion.path d="M12 17V8" {...common} animate={{scaleY:hot?1.18:1}} style={{transformOrigin:'12px 17px'}} transition={{...transition,delay:.05}}/><motion.path d="M17 17v-8" {...common} animate={{scaleY:hot?1.35:1}} style={{transformOrigin:'17px 17px'}} transition={{...transition,delay:.1}}/></>}
    {name==='certificate'&&<><motion.path d="M12 3.5 19 6v5.2c0 4.4-2.8 7.4-7 9.3-4.2-1.9-7-4.9-7-9.3V6z" {...common} animate={{rotate:hot?[0,-4,3,0]:0}} style={{transformOrigin:'12px 12px'}} transition={{duration:.6}}/><motion.path d="m8.8 12 2 2 4.4-4.4" {...common} initial={{pathLength:1}} animate={{pathLength:hot?[0,1]:1}} transition={{duration:.55}}/></>}
    {name==='history'&&<><circle cx="12" cy="12" r="8.2" {...common}/><motion.path d="M12 7.6V12l3 2" {...common} animate={{rotate:hot?360:0}} style={{transformOrigin:'12px 12px'}} transition={{duration:.9,ease:'easeInOut'}}/></>}
    {name==='settings'&&<motion.g animate={{rotate:hot?90:0}} style={{transformOrigin:'12px 12px'}} transition={{duration:.6,ease:[.22,1,.36,1]}}><path d="M9.6 4.3 10.2 3h3.6l.6 1.3 1.5.6 1.3-.5 2.5 2.5-.5 1.3.6 1.5 1.3.6v3.6l-1.3.6-.6 1.5.5 1.3-2.5 2.5-1.3-.5-1.5.6-.6 1.3h-3.6l-.6-1.3-1.5-.6-1.3.5-2.5-2.5.5-1.3-.6-1.5-1.3-.6V9.8l1.3-.6.6-1.5-.5-1.3 2.5-2.5 1.3.5z" {...common}/><circle cx="12" cy="12" r="2.4" {...common}/></motion.g>}
    {name==='dashboard'&&<>{[[4,4,7,6],[13,4,7,9],[4,12,7,8],[13,15,7,5]].map((r,i)=><motion.rect key={i} x={r[0]} y={r[1]} width={r[2]} height={r[3]} rx="1.2" {...common} animate={{y:hot?[0,i%2?-.7:.7,0]:0}} transition={{duration:.58,delay:i*.06}}/>)}</>}
    {name==='refresh'&&<motion.g animate={{rotate:hot?360:0}} style={{transformOrigin:'12px 12px'}} transition={{duration:.72,ease:[.22,1,.36,1]}}><path d="M20 7v5h-5" {...common}/><path d="M4 17v-5h5" {...common}/><path d="M18.1 9a7 7 0 0 0-11.8-2.2L4 9" {...common}/><path d="M5.9 15a7 7 0 0 0 11.8 2.2L20 15" {...common}/></motion.g>}
    {name==='download'&&<><path d="M5 19.5h14" {...common}/><motion.path d="M12 4v10m0 0-3.5-3.5M12 14l3.5-3.5" {...common} animate={{y:hot?[0,2,0]:0}} transition={{duration:.58}}/></>}
    {name==='upload'&&<><path d="M5 19.5h14" {...common}/><motion.path d="M12 16V6m0 0L8.5 9.5M12 6l3.5 3.5" {...common} animate={{y:hot?[0,-2,0]:0}} transition={{duration:.58}}/></>}
    {name==='eye'&&<><motion.path d="M3.5 12s3-5 8.5-5 8.5 5 8.5 5-3 5-8.5 5S3.5 12 3.5 12Z" {...common} animate={{scaleX:hot?[1,.92,1]:1}} style={{transformOrigin:'12px 12px'}} transition={{duration:.45}}/><motion.circle cx="12" cy="12" r="2.4" {...common} animate={{x:hot?[0,1.2,0]:0}} transition={{duration:.45}}/></>}
    {name==='warning'&&<><motion.path d="M12 4 21 20H3z" {...common} animate={{rotate:hot?[0,-3,3,0]:0}} style={{transformOrigin:'12px 12px'}} transition={{duration:.5}}/><path d="M12 9v4.5" {...common}/><circle cx="12" cy="16.8" r=".7" fill="currentColor" stroke="none"/></>}
    {name==='check'&&<motion.path d="m5 12.5 4.2 4.2L19 7" {...common} initial={{pathLength:1}} animate={{pathLength:hot?[0,1]:1}} transition={{duration:.55}}/>}
  </motion.svg>;
}
''')

# Extractor CSS: larger hierarchy + scoped exact ADM dark zebra override.
p = Path("src/styles/fiscal-extractor.css")
css = p.read_text()
css = css.replace("font-family:'Inter','Helvetica Neue',Arial,sans-serif;", "font-family:'Space Grotesk','Inter',system-ui,sans-serif;")
css = css.replace("font-family:'Proxima Nova','Inter','Helvetica Neue',Arial,sans-serif", "font-family:'Space Grotesk','Inter',system-ui,sans-serif")
css = css.replace("background:radial-gradient(circle at 50% -120%,rgba(62,104,154,.24),transparent 58%),linear-gradient(180deg,#0a1422 0%,#07111d 100%);", "background:radial-gradient(circle at 50% -150%,rgba(46,80,112,.18),transparent 56%),linear-gradient(180deg,#040b14 0%,#020817 100%);")
css += r'''

/* STRUCTURE V2 — administrator type, exact dark fiscal zebra, larger controls. */
.extractor-app,.extractor-app button,.extractor-app input,.extractor-app select,.extractor-app textarea,.extractor-app table{font-family:'Space Grotesk','Inter',system-ui,sans-serif;letter-spacing:-.005em}
.extractor-page{max-width:1600px;padding:34px 38px 64px}.extractor-page-heading{margin-bottom:26px}.extractor-page-heading h1{font-size:29px;letter-spacing:-.02em}.extractor-page-heading p{font-size:13px;line-height:1.55}.extractor-eyebrow{font-size:10px}.extractor-eyebrow svg{width:17px;height:17px}
.extractor-sidebar nav button{height:44px;gap:12px;padding:0 12px}.extractor-sidebar nav button>span{font-size:13px}.extractor-sidebar .extractor-nav-icon{width:20px;height:20px;flex-basis:20px}.extractor-sidebar nav section>p{font-size:10px}.extractor-sidebar-title strong{font-size:15px}.extractor-sidebar-title small{font-size:11px}
.extractor-metric{min-height:126px;padding:18px}.extractor-metric p{font-size:12px}.extractor-metric>div svg{width:25px;height:25px}.extractor-metric>strong{margin-top:12px;font-size:25px}.extractor-metric>span{font-size:10.5px}.extractor-panel-head{min-height:72px;padding:16px 18px}.extractor-panel-head svg{width:21px;height:21px}.extractor-panel-head h2{font-size:15px}.extractor-panel-head p{font-size:10.5px}.extractor-primary,.extractor-secondary{height:42px;padding:0 16px;font-size:12px}.extractor-primary svg,.extractor-secondary svg{width:18px;height:18px}.extractor-company-select{height:42px;font-size:12px}
.extractor-company-head{height:44px;font-size:9.5px}.extractor-company-row{min-height:86px;cursor:pointer;transition:background .14s ease,box-shadow .14s ease}.extractor-company-row:hover,.extractor-company-row:focus-visible{background:#111a28;outline:none;box-shadow:inset 2px 0 0 #d7b65a}.extractor-company-row>div strong{font-size:12.5px}.extractor-company-row>div span{font-size:10px}.extractor-company-row>div:first-child strong{font-size:13px}.extractor-row-actions button,.extractor-certificate-row>button{height:34px;font-size:10px}.extractor-row-actions button svg{width:16px;height:16px}
.extractor-certificate-row{min-height:74px;cursor:pointer;font-size:11px}.extractor-certificate-row:hover,.extractor-certificate-row:focus-visible{background:#111a28;outline:none}.extractor-certificate-row>div strong{font-size:12.5px}.extractor-certificate-row>div span{font-size:10px}
.extractor-active-company{padding:17px 19px}.extractor-active-company p{font-size:10px}.extractor-active-company strong{font-size:15px}.extractor-active-company span{font-size:10.5px}.extractor-active-company>div:last-child{font-size:10.5px}.extractor-active-company>div:last-child svg{width:17px;height:17px}.extractor-period{padding:12px 14px}.extractor-year strong{font-size:19px}.extractor-months button{height:36px;font-size:11px}
body .extractor-app .extractor-admin-table table,body .extractor-app .extractor-admin-table tbody{background:#0b0f1c!important}body .extractor-app .extractor-admin-table thead,body .extractor-app .extractor-admin-table thead th{background:#101725!important}body .extractor-app .extractor-admin-table tbody td{background:transparent!important}body .extractor-app .extractor-admin-table table>tbody>tr.ws-zebra-row:nth-child(odd){background-color:hsl(222 84% 5%)!important}body .extractor-app .extractor-admin-table table>tbody>tr.ws-zebra-row:nth-child(even){background-color:hsl(217 32% 12.5%)!important}body .extractor-app .extractor-admin-table table>tbody>tr.ws-zebra-row:hover,body .extractor-app .extractor-admin-table table>tbody>tr.ws-zebra-row:focus-visible{background-color:hsl(217 32% 17%)!important;outline:none}
.extractor-admin-table th{height:44px;font-size:10px}.extractor-admin-table td{height:64px;font-size:12px}.extractor-admin-table td span{font-size:9.5px}.extractor-admin-table td .key{font-size:9px}.extractor-type,.extractor-state{font-size:8.5px!important}.extractor-view{height:34px;font-size:10px}.extractor-view svg{width:16px;height:16px}.extractor-filter-row{padding:13px 15px}.extractor-filter-row button{height:32px;font-size:10px}.extractor-filter-row>span{font-size:9.5px}.extractor-search-row{padding:0 15px 13px}.extractor-search-row label,.extractor-toolbar label{height:42px;font-size:12px}.extractor-search-row label svg,.extractor-toolbar label svg{width:18px;height:18px}.extractor-admin-table tbody tr[role="button"]{cursor:pointer}
.extractor-usage{width:calc(100% - 28px);display:block;margin:12px 14px 16px;padding:15px 10px;border:0;border-top:1px solid #172438;border-radius:4px;background:transparent;color:inherit;text-align:left;transition:background .15s ease}.extractor-usage:hover,.extractor-usage:focus-visible{background:#0d1623;outline:none}.extractor-usage small{font-size:10px}.extractor-usage strong{font-size:22px}.extractor-usage strong b{color:#718296;font-size:11px;font-weight:500}.extractor-usage span{font-size:10px}.extractor-usage em{display:block;margin-top:8px;color:#d7b65a;font-size:9.5px;font-style:normal;font-weight:600}
.extractor-account-trigger{width:40px!important;height:40px!important;font-size:12px!important}.extractor-brand img{height:28px!important;max-height:28px!important;max-width:118px!important}
.extractor-settings-page{padding-bottom:72px}.extractor-plan-hero{padding:22px;border:1px solid #1b2838;border-radius:5px;background:#0b0f1c}.extractor-plan-hero-head{display:flex;align-items:flex-start;justify-content:space-between;gap:20px}.extractor-plan-hero-head>div>span{color:#8493a3;font-size:11px;font-weight:600}.extractor-plan-hero-head h2{margin:5px 0 0;font-size:23px;font-weight:600}.extractor-plan-hero-head p{margin:5px 0 0;color:#718296;font-size:11px}.extractor-plan-hero-head>b{padding:5px 9px;border-radius:4px;background:#10251d;color:#79b99b;font-size:10px}.extractor-plan-progress-copy{display:flex;justify-content:space-between;gap:16px;margin-top:24px}.extractor-plan-progress-copy strong{font-size:13px}.extractor-plan-progress-copy span{color:#8493a3;font-size:11px}.extractor-plan-progress{height:8px;margin-top:9px;overflow:hidden;border-radius:3px;background:#172438}.extractor-plan-progress i{display:block;height:100%;min-width:2px;background:#d7b65a;transition:width .25s ease}.extractor-plan-facts{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:20px}.extractor-plan-facts>div{padding:14px;border:1px solid #1b2838;border-radius:4px;background:#101725}.extractor-plan-facts span{display:block;color:#8493a3;font-size:10.5px}.extractor-plan-facts strong{display:block;margin-top:6px;font-size:18px;font-weight:550}.extractor-settings-grid-large{grid-template-columns:minmax(360px,.88fr) minmax(0,1.35fr);gap:12px;margin-top:12px}.extractor-usage-history{padding:8px 18px 18px}.extractor-usage-history>div{display:grid;grid-template-columns:105px 110px 1fr;align-items:center;gap:14px;padding:14px 0;border-bottom:1px solid #172438}.extractor-usage-history>div:last-child{border-bottom:0}.extractor-usage-history span{color:#8493a3;font-size:11px;text-transform:capitalize}.extractor-usage-history strong{font-size:12px}.extractor-usage-history small{color:#718296;font-size:10px}.extractor-settings-companies{padding:10px 18px 18px}.extractor-settings-companies>div{padding:15px 0}.extractor-settings-companies strong{font-size:12.5px}.extractor-settings-companies small{font-size:10px}.extractor-settings-companies>div>span:last-child{font-size:10px;line-height:1.55}.extractor-upgrade-panel{margin-top:12px}.extractor-upgrade-body{display:grid;grid-template-columns:minmax(0,1fr) minmax(340px,.6fr);gap:28px;padding:20px}.extractor-upgrade-body h3{margin:0;font-size:16px}.extractor-upgrade-body p{max-width:720px;margin:7px 0 0;color:#718296;font-size:11px;line-height:1.6}.extractor-upgrade-pending{display:inline-flex;margin-top:12px;padding:7px 9px;border-radius:4px;background:#2c2512;color:#cfaf5d;font-size:10px}.extractor-upgrade-form{display:flex;align-items:flex-end;gap:10px}.extractor-upgrade-form label{flex:1;color:#8795a5;font-size:10px;font-weight:600}.extractor-upgrade-form input{width:100%;height:42px;margin-top:6px;padding:0 11px;border:1px solid #28384b;border-radius:4px;background:#0e1724;color:#e2e9ef;outline:0;font-size:12px}.extractor-history>div{padding:32px}.extractor-history h2{font-size:20px}.extractor-history p{font-size:12px}.extractor-form-row label,.extractor-modal-body label{font-size:11px}.extractor-form-row input,.extractor-modal-body input{height:44px;font-size:12px}.extractor-settings-grid dl{margin:14px 18px 18px}.extractor-settings-grid dl div{padding:14px 0}.extractor-settings-grid dt{font-size:11px}.extractor-settings-grid dd{font-size:12px}
@media(max-width:900px){.extractor-plan-facts{grid-template-columns:1fr 1fr}.extractor-settings-grid-large{grid-template-columns:1fr}.extractor-upgrade-body{grid-template-columns:1fr}.extractor-upgrade-form{align-items:stretch;flex-direction:column}.extractor-upgrade-form button{width:100%}}
@media(max-width:720px){.extractor-page{padding:22px 14px 40px}.extractor-page-heading h1{font-size:25px}.extractor-plan-facts{grid-template-columns:1fr 1fr}.extractor-plan-hero{padding:17px}.extractor-usage-history>div{grid-template-columns:90px 1fr}.extractor-usage-history small{grid-column:1/-1}.extractor-admin-table td{font-size:11px}}
'''
p.write_text(css)

# Product/account separation plus real monthly usage and upgrade requests.
Path("supabase/migrations/20260908215500_isolate_extractor_product_and_usage.sql").write_text(r'''alter table public.organizations
  add column if not exists product_scope text not null default 'general';

alter table public.organizations drop constraint if exists organizations_product_scope_check;
alter table public.organizations add constraint organizations_product_scope_check
  check (product_scope in ('general','saas','extractor','shared'));

comment on column public.organizations.product_scope is
  'Product boundary for memberships. Extractor-only organizations must never appear inside the fiscal issuer.';

do $$
declare
  v_user uuid;
  v_org uuid;
  v_account uuid;
begin
  select id into v_user from auth.users where lower(email)='wsteste@gmail.com' limit 1;
  if v_user is null then return; end if;

  select id into v_org from public.organizations where slug='ws-teste-extrator' limit 1;
  if v_org is null then
    insert into public.organizations(name,slug,status,owner_user_id,product_scope)
    values ('WS teste','ws-teste-extrator','active',v_user,'extractor')
    returning id into v_org;
  else
    update public.organizations
    set name='WS teste',status='active',owner_user_id=v_user,product_scope='extractor',updated_at=now()
    where id=v_org;
  end if;

  insert into public.organization_members(organization_id,user_id,role,status)
  values(v_org,v_user,'owner','active')
  on conflict(organization_id,user_id) do update
    set role='owner',status='active',updated_at=now();

  select ea.id into v_account
  from public.extractor_accounts ea
  join public.organization_members om on om.organization_id=ea.organization_id
  where om.user_id=v_user and ea.plan_code='lifetime_test'
  order by ea.created_at limit 1;

  if v_account is not null then
    update public.extractor_accounts
    set organization_id=v_org,name='WS teste',updated_at=now()
    where id=v_account;
  end if;
end $$;

update public.organizations o
set product_scope='extractor',updated_at=now()
where exists(select 1 from public.extractor_accounts ea where ea.organization_id=o.id)
  and not exists(select 1 from public.saas_company_fiscal_profiles sp where sp.organization_id=o.id)
  and not exists(select 1 from public.saas_subscriptions ss where ss.organization_id=o.id);

update public.organizations o
set product_scope='saas',updated_at=now()
where (exists(select 1 from public.saas_company_fiscal_profiles sp where sp.organization_id=o.id)
    or exists(select 1 from public.saas_subscriptions ss where ss.organization_id=o.id))
  and not exists(select 1 from public.extractor_accounts ea where ea.organization_id=o.id);

update public.organizations o
set product_scope='shared',updated_at=now()
where exists(select 1 from public.extractor_accounts ea where ea.organization_id=o.id)
  and (exists(select 1 from public.saas_company_fiscal_profiles sp where sp.organization_id=o.id)
    or exists(select 1 from public.saas_subscriptions ss where ss.organization_id=o.id));

create table if not exists public.extractor_plan_change_requests(
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.extractor_accounts(id) on delete cascade,
  requested_by uuid not null references auth.users(id) on delete cascade,
  current_limit integer not null check(current_limit>=100),
  requested_limit integer not null check(requested_limit>=100),
  status text not null default 'pending' check(status in ('pending','approved','rejected','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolution_note text
);
create index if not exists extractor_plan_change_requests_account_created_idx
  on public.extractor_plan_change_requests(account_id,created_at desc);
alter table public.extractor_plan_change_requests enable row level security;
revoke all on public.extractor_plan_change_requests from anon,authenticated;

create or replace function public.extractor_usage_snapshot()
returns jsonb
language plpgsql
stable
security definer
set search_path=''
as $$
declare
  v_account public.extractor_accounts%rowtype;
  v_start date;
  v_end date;
  v_used integer:=0;
  v_documents integer:=0;
  v_pending integer:=0;
  v_history jsonb:='[]'::jsonb;
  v_request jsonb:=null;
begin
  select ea.* into v_account
  from public.extractor_accounts ea
  where ea.status in ('trialing','active','past_due')
    and (private.is_extractor_member(ea.id,auth.uid()) or private.is_any_admin(auth.uid()))
  order by ea.created_at limit 1;
  if v_account.id is null then return null; end if;

  v_start:=coalesce(v_account.current_period_start,date_trunc('month',current_date)::date);
  v_end:=(v_start+interval '1 month')::date;

  select
    count(fd.id) filter(where fd.full_xml=true and fd.xml is not null)::integer,
    count(fd.id)::integer,
    count(fd.id) filter(where not(fd.full_xml=true and fd.xml is not null))::integer
  into v_used,v_documents,v_pending
  from public.extractor_companies ec
  join public.fiscal_dfe_documents fd on fd.company_id=ec.fiscal_company_id
  where ec.account_id=v_account.id and ec.status='active'
    and coalesce(fd.document_kind,'')<>'evento'
    and fd.issue_date>=v_start and fd.issue_date<v_end;

  select coalesce(jsonb_agg(jsonb_build_object(
    'month',to_char(x.month_start,'YYYY-MM'),
    'xml_used',x.xml_used,
    'documents',x.documents,
    'pending_xml',x.pending_xml
  ) order by x.month_start),'[]'::jsonb)
  into v_history
  from (
    select gs::date month_start,
      count(fd.id) filter(where fd.full_xml=true and fd.xml is not null)::integer xml_used,
      count(fd.id)::integer documents,
      count(fd.id) filter(where fd.id is not null and not(fd.full_xml=true and fd.xml is not null))::integer pending_xml
    from generate_series(date_trunc('month',current_date)-interval '5 months',date_trunc('month',current_date),interval '1 month') gs
    left join public.extractor_companies ec on ec.account_id=v_account.id and ec.status='active'
    left join public.fiscal_dfe_documents fd on fd.company_id=ec.fiscal_company_id
      and coalesce(fd.document_kind,'')<>'evento'
      and fd.issue_date>=gs and fd.issue_date<gs+interval '1 month'
    group by gs::date
  ) x;

  select jsonb_build_object('id',r.id,'requested_limit',r.requested_limit,'status',r.status,'created_at',r.created_at)
  into v_request
  from public.extractor_plan_change_requests r
  where r.account_id=v_account.id
  order by r.created_at desc limit 1;

  return jsonb_build_object(
    'account_id',v_account.id,
    'plan_code',v_account.plan_code,
    'period_start',v_start,
    'period_end',(v_end-1),
    'xml_used',coalesce(v_used,0),
    'xml_limit',v_account.monthly_xml_limit,
    'xml_remaining',greatest(v_account.monthly_xml_limit-coalesce(v_used,0),0),
    'usage_percent',case when v_account.monthly_xml_limit>0 then round((coalesce(v_used,0)::numeric*100)/v_account.monthly_xml_limit,1) else 0 end,
    'documents',coalesce(v_documents,0),
    'pending_xml',coalesce(v_pending,0),
    'history',v_history,
    'latest_plan_request',v_request
  );
end;
$$;

create or replace function public.extractor_request_plan_upgrade(_requested_limit integer)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_account public.extractor_accounts%rowtype;
  v_request_id uuid;
begin
  select ea.* into v_account
  from public.extractor_accounts ea
  where ea.status in ('trialing','active','past_due')
    and private.can_manage_extractor(ea.id,auth.uid())
  order by ea.created_at limit 1;
  if v_account.id is null then raise exception 'extractor_access_denied' using errcode='42501'; end if;
  if _requested_limit is null or _requested_limit<=v_account.monthly_xml_limit then
    return jsonb_build_object('ok',false,'code','LIMIT_NOT_HIGHER','message','O novo limite precisa ser maior que o limite atual.');
  end if;
  if _requested_limit>10000000 then
    return jsonb_build_object('ok',false,'code','LIMIT_TOO_HIGH','message','O limite solicitado excede a faixa suportada.');
  end if;

  select id into v_request_id
  from public.extractor_plan_change_requests
  where account_id=v_account.id and status='pending'
  order by created_at desc limit 1;

  if v_request_id is null then
    insert into public.extractor_plan_change_requests(account_id,requested_by,current_limit,requested_limit)
    values(v_account.id,auth.uid(),v_account.monthly_xml_limit,_requested_limit)
    returning id into v_request_id;
  else
    update public.extractor_plan_change_requests
    set requested_by=auth.uid(),current_limit=v_account.monthly_xml_limit,requested_limit=_requested_limit,updated_at=now()
    where id=v_request_id;
  end if;

  return jsonb_build_object('ok',true,'request_id',v_request_id,'requested_limit',_requested_limit,'status','pending');
end;
$$;

revoke execute on function public.extractor_usage_snapshot() from public,anon;
revoke execute on function public.extractor_request_plan_upgrade(integer) from public,anon;
grant execute on function public.extractor_usage_snapshot() to authenticated;
grant execute on function public.extractor_request_plan_upgrade(integer) to authenticated;
''')
