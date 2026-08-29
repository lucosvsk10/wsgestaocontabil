import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

export type CadastroSection = "Clientes" | "Fornecedores" | "Produtos" | "Serviços" | "Transportadoras";

type Props = {
  organizationId: string | null;
  section: CadastroSection;
};

const inputClass = "mt-2 h-11 !border-[#d9e0e8] !bg-white !text-[#10203e] dark:!bg-white dark:!text-[#10203e] placeholder:!text-[#9aa6b5]";
const panelClass = "rounded-2xl border border-[#e0e5ec] bg-white p-6 md:p-7 shadow-[0_1px_2px_rgba(15,31,61,.02)]";

const partyTypeBySection: Record<Exclude<CadastroSection, "Produtos" | "Serviços">, string> = {
  Clientes: "customer",
  Fornecedores: "supplier",
  Transportadoras: "carrier",
};

const blankParty = (section: CadastroSection) => ({
  status: "active",
  person_type: "legal",
  legal_name: "",
  trade_name: "",
  tax_id: "",
  state_registration: "",
  municipal_registration: "",
  ie_indicator: "",
  suframa: "",
  tax_regime: "",
  email: "",
  phone: "",
  mobile: "",
  contact_name: "",
  website: "",
  postal_code: "",
  street: "",
  street_number: "",
  complement: "",
  district: "",
  city: "",
  state: "",
  country: "Brasil",
  city_ibge_code: "",
  country_code: "1058",
  final_consumer: section === "Clientes",
  icms_taxpayer: false,
  billing_email: "",
  payment_terms: "",
  credit_limit: "",
  bank_name: "",
  bank_branch: "",
  bank_account: "",
  pix_key: "",
  rntrc: "",
  antt_category: "",
  vehicle_plate: "",
  vehicle_state: "",
  vehicle_rntc: "",
  freight_default_mode: "",
  notes: "",
});

const blankCatalog = (section: CadastroSection) => ({
  status: "active",
  code: "",
  name: "",
  description: "",
  unit: section === "Produtos" ? "UN" : "",
  sale_price: "",
  cost_price: "",
  gtin: "",
  ncm: "",
  cest: "",
  product_origin: "0",
  cfop_in_state: "",
  cfop_out_state: "",
  icms_cst: "",
  csosn: "",
  icms_rate: "",
  icms_reduction_rate: "",
  ipi_cst: "",
  ipi_rate: "",
  pis_cst: "",
  pis_rate: "",
  cofins_cst: "",
  cofins_rate: "",
  service_code_national: "",
  service_code_municipal: "",
  cnae: "",
  iss_rate: "",
  iss_withheld: false,
  inss_withheld: false,
  ir_withheld: false,
  csll_withheld: false,
  pis_withheld: false,
  cofins_withheld: false,
  approximate_tax_rate: "",
  stock_managed: false,
  stock_quantity: "",
  stock_minimum: "",
  weight_net: "",
  weight_gross: "",
  fiscal_notes: "",
});

function Field({ label, value, onChange, placeholder, type = "text" }: { label: string; value: any; onChange: (value: string) => void; placeholder?: string; type?: string }) {
  return <label className="block text-sm font-medium text-[#263652]">{label}<Input type={type} value={value ?? ""} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={inputClass}/></label>;
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<[string,string]> }) {
  return <label className="block text-sm font-medium text-[#263652]">{label}<select value={value || ""} onChange={e=>onChange(e.target.value)} className="mt-2 h-11 w-full rounded-lg border border-[#d9e0e8] bg-white px-3 text-sm text-[#10203e] outline-none focus:border-[#9bb9e9]">{options.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>;
}

function CheckField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="flex min-h-11 items-center justify-between rounded-xl border border-[#e0e5ec] bg-[#fbfcfe] px-4 py-3 text-sm font-medium text-[#263652]"><span>{label}</span><input type="checkbox" checked={!!checked} onChange={e=>onChange(e.target.checked)} className="h-4 w-4"/></label>;
}

function SectionTitle({ title, description }: { title: string; description?: string }) {
  return <div className="mb-5"><h3 className="text-base font-semibold text-[#12213f]">{title}</h3>{description && <p className="mt-1 text-xs leading-5 text-[#7c8799]">{description}</p>}</div>;
}

const numericCatalogFields = ["sale_price","cost_price","icms_rate","icms_reduction_rate","ipi_rate","pis_rate","cofins_rate","iss_rate","approximate_tax_rate","stock_quantity","stock_minimum","weight_net","weight_gross"];

export default function SaasCadastros({ organizationId, section }: Props) {
  const isCatalog = section === "Produtos" || section === "Serviços";
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");

  const load = async () => {
    if (!organizationId) return;
    setLoading(true);
    try {
      if (isCatalog) {
        const itemType = section === "Produtos" ? "product" : "service";
        const { data, error } = await (supabase as any).from("saas_fiscal_catalog_items").select("*").eq("organization_id", organizationId).eq("item_type", itemType).order("name");
        if (error) throw error;
        setRows(data || []);
      } else {
        const partyType = partyTypeBySection[section as keyof typeof partyTypeBySection];
        const { data, error } = await (supabase as any).from("saas_fiscal_parties").select("*").eq("organization_id", organizationId).eq("party_type", partyType).order("legal_name");
        if (error) throw error;
        setRows(data || []);
      }
    } catch (error: any) {
      setMessage(error?.message || "Não foi possível carregar os cadastros.");
    } finally { setLoading(false); }
  };

  useEffect(() => { setForm(null); setSearch(""); setMessage(""); void load(); }, [organizationId, section]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(row => String(isCatalog ? `${row.code||""} ${row.name||""} ${row.ncm||""}` : `${row.legal_name||""} ${row.trade_name||""} ${row.tax_id||""}`).toLowerCase().includes(q));
  }, [rows, search, isCatalog]);

  const set = (key: string, value: any) => setForm((prev: any) => ({ ...prev, [key]: value }));

  const startNew = () => setForm(isCatalog ? blankCatalog(section) : blankParty(section));
  const startEdit = (row: any) => setForm({ ...row });

  const save = async () => {
    if (!organizationId || !form) return;
    const requiredName = isCatalog ? form.name : form.legal_name;
    if (!String(requiredName || "").trim()) { setMessage("Informe o nome antes de salvar."); return; }
    setSaving(true); setMessage("");
    try {
      if (isCatalog) {
        const payload: any = { ...form, organization_id: organizationId, item_type: section === "Produtos" ? "product" : "service", updated_at: new Date().toISOString() };
        numericCatalogFields.forEach(key => { payload[key] = payload[key] === "" || payload[key] == null ? null : Number(payload[key]); });
        delete payload.created_at;
        const query = payload.id
          ? (supabase as any).from("saas_fiscal_catalog_items").update(payload).eq("id", payload.id)
          : (supabase as any).from("saas_fiscal_catalog_items").insert(payload);
        const { error } = await query;
        if (error) throw error;
      } else {
        const payload: any = { ...form, organization_id: organizationId, party_type: partyTypeBySection[section as keyof typeof partyTypeBySection], updated_at: new Date().toISOString() };
        payload.credit_limit = payload.credit_limit === "" || payload.credit_limit == null ? null : Number(payload.credit_limit);
        delete payload.created_at;
        const query = payload.id
          ? (supabase as any).from("saas_fiscal_parties").update(payload).eq("id", payload.id)
          : (supabase as any).from("saas_fiscal_parties").insert(payload);
        const { error } = await query;
        if (error) throw error;
      }
      setForm(null); setMessage("Cadastro salvo com sucesso."); await load();
    } catch (error: any) { setMessage(error?.message || "Não foi possível salvar."); }
    finally { setSaving(false); }
  };

  const remove = async (row: any) => {
    if (!window.confirm(`Excluir ${isCatalog ? row.name : row.legal_name}?`)) return;
    const table = isCatalog ? "saas_fiscal_catalog_items" : "saas_fiscal_parties";
    const { error } = await (supabase as any).from(table).delete().eq("id", row.id);
    if (error) { setMessage(error.message); return; }
    await load();
  };

  const PartyForm = () => <div className="space-y-5">
    <div className={panelClass}><SectionTitle title="Identificação" description="Dados usados para localizar e identificar a pessoa ou empresa nas emissões."/><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <SelectField label="Tipo de pessoa" value={form.person_type} onChange={v=>set("person_type",v)} options={[["legal","Pessoa jurídica"],["individual","Pessoa física"],["foreign","Exterior"]]}/>
      <Field label="Razão social / Nome completo" value={form.legal_name} onChange={v=>set("legal_name",v)}/>
      <Field label="Nome fantasia" value={form.trade_name} onChange={v=>set("trade_name",v)}/>
      <Field label="CNPJ / CPF / Documento" value={form.tax_id} onChange={v=>set("tax_id",v)}/>
      <SelectField label="Situação" value={form.status} onChange={v=>set("status",v)} options={[["active","Ativo"],["inactive","Inativo"]]}/>
      <Field label="Contato responsável" value={form.contact_name} onChange={v=>set("contact_name",v)}/>
    </div></div>

    <div className={panelClass}><SectionTitle title="Dados fiscais" description="Informações que afetam destinatário, retenções, ICMS e validações da nota."/><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <Field label="Inscrição estadual" value={form.state_registration} onChange={v=>set("state_registration",v)}/>
      <Field label="Inscrição municipal" value={form.municipal_registration} onChange={v=>set("municipal_registration",v)}/>
      <SelectField label="Indicador da IE" value={form.ie_indicator} onChange={v=>set("ie_indicator",v)} options={[["","Não informado"],["1","Contribuinte ICMS"],["2","Contribuinte isento"],["9","Não contribuinte"]]}/>
      <Field label="SUFRAMA" value={form.suframa} onChange={v=>set("suframa",v)}/>
      <SelectField label="Regime tributário" value={form.tax_regime} onChange={v=>set("tax_regime",v)} options={[["","Não informado"],["simples","Simples Nacional"],["presumido","Lucro Presumido"],["real","Lucro Real"],["mei","MEI"]]}/>
      <div className="grid gap-3"><CheckField label="Consumidor final" checked={!!form.final_consumer} onChange={v=>set("final_consumer",v)}/><CheckField label="Contribuinte do ICMS" checked={!!form.icms_taxpayer} onChange={v=>set("icms_taxpayer",v)}/></div>
    </div></div>

    <div className={panelClass}><SectionTitle title="Contato"/><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <Field label="E-mail" value={form.email} onChange={v=>set("email",v)} type="email"/>
      <Field label="E-mail para cobrança / fiscal" value={form.billing_email} onChange={v=>set("billing_email",v)} type="email"/>
      <Field label="Telefone" value={form.phone} onChange={v=>set("phone",v)}/>
      <Field label="Celular / WhatsApp" value={form.mobile} onChange={v=>set("mobile",v)}/>
      <Field label="Website" value={form.website} onChange={v=>set("website",v)}/>
    </div></div>

    <div className={panelClass}><SectionTitle title="Endereço" description="O código IBGE do município é importante para documentos eletrônicos."/><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Field label="CEP" value={form.postal_code} onChange={v=>set("postal_code",v)}/>
      <div className="xl:col-span-2"><Field label="Logradouro" value={form.street} onChange={v=>set("street",v)}/></div>
      <Field label="Número" value={form.street_number} onChange={v=>set("street_number",v)}/>
      <Field label="Complemento" value={form.complement} onChange={v=>set("complement",v)}/>
      <Field label="Bairro" value={form.district} onChange={v=>set("district",v)}/>
      <Field label="Cidade" value={form.city} onChange={v=>set("city",v)}/>
      <Field label="UF" value={form.state} onChange={v=>set("state",v)} placeholder="AL"/>
      <Field label="Código IBGE do município" value={form.city_ibge_code} onChange={v=>set("city_ibge_code",v)}/>
      <Field label="País" value={form.country} onChange={v=>set("country",v)}/>
      <Field label="Código do país" value={form.country_code} onChange={v=>set("country_code",v)}/>
    </div></div>

    {(section === "Clientes" || section === "Fornecedores") && <div className={panelClass}><SectionTitle title="Condições comerciais"/><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <Field label="Condição / prazo de pagamento" value={form.payment_terms} onChange={v=>set("payment_terms",v)} placeholder="Ex.: 30 dias"/>
      <Field label="Limite de crédito" value={form.credit_limit} onChange={v=>set("credit_limit",v)} type="number"/>
      {section === "Fornecedores" && <><Field label="Banco" value={form.bank_name} onChange={v=>set("bank_name",v)}/><Field label="Agência" value={form.bank_branch} onChange={v=>set("bank_branch",v)}/><Field label="Conta" value={form.bank_account} onChange={v=>set("bank_account",v)}/><Field label="Chave PIX" value={form.pix_key} onChange={v=>set("pix_key",v)}/></>}
    </div></div>}

    {section === "Transportadoras" && <div className={panelClass}><SectionTitle title="Dados de transporte" description="Informações úteis para NF-e, CT-e, MDF-e e cálculo do frete."/><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <Field label="RNTRC" value={form.rntrc} onChange={v=>set("rntrc",v)}/>
      <Field label="Categoria ANTT" value={form.antt_category} onChange={v=>set("antt_category",v)}/>
      <Field label="Placa padrão" value={form.vehicle_plate} onChange={v=>set("vehicle_plate",v)}/>
      <Field label="UF do veículo" value={form.vehicle_state} onChange={v=>set("vehicle_state",v)}/>
      <Field label="RNTC do veículo" value={form.vehicle_rntc} onChange={v=>set("vehicle_rntc",v)}/>
      <SelectField label="Modalidade padrão do frete" value={form.freight_default_mode} onChange={v=>set("freight_default_mode",v)} options={[["","Não definida"],["0","Por conta do remetente"],["1","Por conta do destinatário"],["2","Por conta de terceiros"],["9","Sem frete"]]}/>
    </div></div>}

    <div className={panelClass}><SectionTitle title="Observações internas"/><textarea value={form.notes || ""} onChange={e=>set("notes",e.target.value)} rows={4} className="w-full rounded-xl border border-[#d9e0e8] bg-white p-3 text-sm text-[#10203e] outline-none focus:border-[#9bb9e9]" placeholder="Informações importantes para sua equipe."/></div>
  </div>;

  const ProductForm = () => <div className="space-y-5">
    <div className={panelClass}><SectionTitle title="Identificação do produto"/><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <Field label="Nome do produto" value={form.name} onChange={v=>set("name",v)}/><Field label="Código / SKU" value={form.code} onChange={v=>set("code",v)}/><Field label="GTIN / EAN" value={form.gtin} onChange={v=>set("gtin",v)}/><Field label="Unidade comercial" value={form.unit} onChange={v=>set("unit",v)} placeholder="UN, KG, CX..."/><Field label="Preço de venda" value={form.sale_price} onChange={v=>set("sale_price",v)} type="number"/><Field label="Preço de custo" value={form.cost_price} onChange={v=>set("cost_price",v)} type="number"/><div className="md:col-span-2 xl:col-span-3"><Field label="Descrição completa" value={form.description} onChange={v=>set("description",v)}/></div>
    </div></div>
    <div className={panelClass}><SectionTitle title="Classificação fiscal" description="Esses campos são reutilizados automaticamente ao montar NF-e e NFC-e."/><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Field label="NCM" value={form.ncm} onChange={v=>set("ncm",v)}/><Field label="CEST" value={form.cest} onChange={v=>set("cest",v)}/><Field label="Origem da mercadoria" value={form.product_origin} onChange={v=>set("product_origin",v)}/><Field label="Carga tributária aproximada (%)" value={form.approximate_tax_rate} onChange={v=>set("approximate_tax_rate",v)} type="number"/><Field label="CFOP dentro do estado" value={form.cfop_in_state} onChange={v=>set("cfop_in_state",v)}/><Field label="CFOP fora do estado" value={form.cfop_out_state} onChange={v=>set("cfop_out_state",v)}/><Field label="CST ICMS" value={form.icms_cst} onChange={v=>set("icms_cst",v)}/><Field label="CSOSN" value={form.csosn} onChange={v=>set("csosn",v)}/><Field label="Alíquota ICMS (%)" value={form.icms_rate} onChange={v=>set("icms_rate",v)} type="number"/><Field label="Redução base ICMS (%)" value={form.icms_reduction_rate} onChange={v=>set("icms_reduction_rate",v)} type="number"/>
    </div></div>
    <div className={panelClass}><SectionTitle title="Tributos federais"/><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Field label="CST IPI" value={form.ipi_cst} onChange={v=>set("ipi_cst",v)}/><Field label="IPI (%)" value={form.ipi_rate} onChange={v=>set("ipi_rate",v)} type="number"/><Field label="CST PIS" value={form.pis_cst} onChange={v=>set("pis_cst",v)}/><Field label="PIS (%)" value={form.pis_rate} onChange={v=>set("pis_rate",v)} type="number"/><Field label="CST COFINS" value={form.cofins_cst} onChange={v=>set("cofins_cst",v)}/><Field label="COFINS (%)" value={form.cofins_rate} onChange={v=>set("cofins_rate",v)} type="number"/>
    </div></div>
    <div className={panelClass}><SectionTitle title="Estoque e logística"/><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><CheckField label="Controlar estoque" checked={!!form.stock_managed} onChange={v=>set("stock_managed",v)}/><Field label="Estoque atual" value={form.stock_quantity} onChange={v=>set("stock_quantity",v)} type="number"/><Field label="Estoque mínimo" value={form.stock_minimum} onChange={v=>set("stock_minimum",v)} type="number"/><Field label="Peso líquido (kg)" value={form.weight_net} onChange={v=>set("weight_net",v)} type="number"/><Field label="Peso bruto (kg)" value={form.weight_gross} onChange={v=>set("weight_gross",v)} type="number"/></div></div>
    <div className={panelClass}><SectionTitle title="Observações fiscais"/><textarea value={form.fiscal_notes || ""} onChange={e=>set("fiscal_notes",e.target.value)} rows={4} className="w-full rounded-xl border border-[#d9e0e8] bg-white p-3 text-sm text-[#10203e] outline-none focus:border-[#9bb9e9]"/></div>
  </div>;

  const ServiceForm = () => <div className="space-y-5">
    <div className={panelClass}><SectionTitle title="Identificação do serviço"/><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"><Field label="Nome do serviço" value={form.name} onChange={v=>set("name",v)}/><Field label="Código interno" value={form.code} onChange={v=>set("code",v)}/><Field label="Valor padrão" value={form.sale_price} onChange={v=>set("sale_price",v)} type="number"/><div className="md:col-span-2 xl:col-span-3"><Field label="Descrição para a NFS-e" value={form.description} onChange={v=>set("description",v)}/></div></div></div>
    <div className={panelClass}><SectionTitle title="Classificação do serviço" description="A prefeitura pode exigir código municipal além do padrão nacional."/><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><Field label="Código de serviço nacional" value={form.service_code_national} onChange={v=>set("service_code_national",v)}/><Field label="Código de serviço municipal" value={form.service_code_municipal} onChange={v=>set("service_code_municipal",v)}/><Field label="CNAE" value={form.cnae} onChange={v=>set("cnae",v)}/><Field label="ISS (%)" value={form.iss_rate} onChange={v=>set("iss_rate",v)} type="number"/><Field label="CST PIS" value={form.pis_cst} onChange={v=>set("pis_cst",v)}/><Field label="PIS (%)" value={form.pis_rate} onChange={v=>set("pis_rate",v)} type="number"/><Field label="CST COFINS" value={form.cofins_cst} onChange={v=>set("cofins_cst",v)}/><Field label="COFINS (%)" value={form.cofins_rate} onChange={v=>set("cofins_rate",v)} type="number"/></div></div>
    <div className={panelClass}><SectionTitle title="Retenções" description="Marque apenas quando o serviço normalmente estiver sujeito à retenção. A emissão poderá permitir ajuste por nota."/><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3"><CheckField label="Reter ISS" checked={!!form.iss_withheld} onChange={v=>set("iss_withheld",v)}/><CheckField label="Reter INSS" checked={!!form.inss_withheld} onChange={v=>set("inss_withheld",v)}/><CheckField label="Reter IR" checked={!!form.ir_withheld} onChange={v=>set("ir_withheld",v)}/><CheckField label="Reter CSLL" checked={!!form.csll_withheld} onChange={v=>set("csll_withheld",v)}/><CheckField label="Reter PIS" checked={!!form.pis_withheld} onChange={v=>set("pis_withheld",v)}/><CheckField label="Reter COFINS" checked={!!form.cofins_withheld} onChange={v=>set("cofins_withheld",v)}/></div></div>
    <div className={panelClass}><SectionTitle title="Observações fiscais"/><textarea value={form.fiscal_notes || ""} onChange={e=>set("fiscal_notes",e.target.value)} rows={4} className="w-full rounded-xl border border-[#d9e0e8] bg-white p-3 text-sm text-[#10203e] outline-none focus:border-[#9bb9e9]"/></div>
  </div>;

  if (form) return <div className="pb-10"><div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><button onClick={()=>setForm(null)} className="mb-3 text-sm font-semibold text-[#58709a]">Voltar para {section.toLowerCase()}</button><h1 className="text-3xl font-semibold tracking-[-0.04em] text-[#10203e]">{form.id ? "Editar" : "Novo"} {section === "Clientes" ? "cliente" : section === "Fornecedores" ? "fornecedor" : section === "Transportadoras" ? "transportadora" : section === "Produtos" ? "produto" : "serviço"}</h1><p className="mt-2 text-sm text-[#6d7a90]">Cadastro detalhado para reduzir digitação e erros na emissão fiscal.</p></div><div className="flex gap-2"><Button variant="outline" onClick={()=>setForm(null)}>Cancelar</Button><Button onClick={save} disabled={saving} className="bg-[#0b5bd7] text-white hover:bg-[#084db9]">{saving ? "Salvando..." : "Salvar cadastro"}</Button></div></div>{message && <div className="mb-5 rounded-xl border border-[#d9e0e8] bg-white px-4 py-3 text-sm text-[#536077]">{message}</div>}{isCatalog ? (section === "Produtos" ? <ProductForm/> : <ServiceForm/>) : <PartyForm/>}</div>;

  return <div><div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6f7e96]">Cadastros</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#10203e]">{section}</h1><p className="mt-2 text-sm text-[#6d7a90]">{section === "Produtos" ? "Produtos completos com classificação fiscal, preços e estoque." : section === "Serviços" ? "Serviços preparados para emissão de NFS-e e retenções." : `Gerencie ${section.toLowerCase()} com dados cadastrais, fiscais, endereço e contato.`}</p></div><Button onClick={startNew} className="h-11 bg-[#0b5bd7] px-5 text-white hover:bg-[#084db9]">Novo cadastro</Button></div><div className="mt-6 flex items-center gap-3"><Input value={search} onChange={e=>setSearch(e.target.value)} placeholder={`Buscar em ${section.toLowerCase()}...`} className={`${inputClass} mt-0 max-w-xl`}/><span className="text-xs text-[#8893a5]">{filtered.length} registro(s)</span></div>{message && <div className="mt-4 rounded-xl border border-[#d9e0e8] bg-white px-4 py-3 text-sm text-[#536077]">{message}</div>}<div className="mt-6 overflow-hidden rounded-2xl border border-[#e0e5ec] bg-white"><div className="grid grid-cols-[minmax(0,1fr)_170px_130px] gap-4 border-b border-[#edf0f4] bg-[#fbfcfe] px-5 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-[#7b8799]"><span>{isCatalog ? "Nome / código" : "Nome / documento"}</span><span>{isCatalog ? "Informação fiscal" : "Contato"}</span><span className="text-right">Ações</span></div>{loading ? <div className="p-8 text-sm text-[#6d7a90]">Carregando...</div> : filtered.length === 0 ? <div className="p-10 text-center"><p className="font-medium text-[#33435e]">Nenhum cadastro ainda.</p><p className="mt-1 text-sm text-[#8792a4]">Crie o primeiro para começar a reutilizar os dados nas emissões.</p></div> : filtered.map(row => <div key={row.id} className="grid grid-cols-[minmax(0,1fr)_170px_130px] items-center gap-4 border-b border-[#f0f2f5] px-5 py-4 last:border-0"><div className="min-w-0"><p className="truncate text-sm font-semibold text-[#1c2d49]">{isCatalog ? row.name : row.legal_name}</p><p className="mt-1 truncate text-xs text-[#8792a4]">{isCatalog ? [row.code,row.description].filter(Boolean).join(" · ") || "Sem código" : [row.trade_name,row.tax_id].filter(Boolean).join(" · ") || "Sem documento"}</p></div><div className="text-xs text-[#61708a]">{isCatalog ? (section === "Produtos" ? `NCM ${row.ncm || "—"}` : `ISS ${row.iss_rate ?? "—"}%`) : (row.email || row.phone || row.mobile || "—")}</div><div className="flex justify-end gap-3"><button onClick={()=>startEdit(row)} className="text-xs font-semibold text-[#2d6fca]">Editar</button><button onClick={()=>void remove(row)} className="text-xs font-semibold text-[#c94a4a]">Excluir</button></div></div>)}</div></div>;
}
