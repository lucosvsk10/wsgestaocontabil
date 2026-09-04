import { useMemo, useState } from 'react';
import { Building2, Check, Mail, MapPin, UserRound } from 'lucide-react';
import '@/styles/saas-customer-flow.css';

type Props = {
  form: any;
  set: (key: string, value: any) => void;
  hideTaxIdForLegal?: boolean;
};

type Step = 'identity' | 'address' | 'contact';

const inputClass = 'customer-flow-input';

const onlyDigits = (value: any) => String(value || '').replace(/\D/g, '');
const formatTaxId = (value: any, personType: string) => {
  const d = onlyDigits(value);
  if (personType === 'individual') {
    return d.slice(0, 11).replace(/^(\d{3})(\d{3})(\d{3})(\d{0,2}).*/, (_, a, b, c, e) =>
      e ? `${a}.${b}.${c}-${e}` : `${a}.${b}.${c}`
    );
  }
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12)
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12, 14)}`;
};
const formatCep = (value: any) => {
  const d = onlyDigits(value).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
};

function Field({
  label,
  value,
  onChange,
  required,
  placeholder,
  type = 'text',
  hint,
}: {
  label: string;
  value: any;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  type?: string;
  hint?: string;
}) {
  const filled = String(value ?? '').trim().length > 0;
  return (
    <label className="customer-flow-field">
      <span>
        {label}
        {required && <b> *</b>}
      </span>
      <div className={`customer-flow-input-wrap ${filled ? 'is-filled' : ''}`}>
        <input
          className={inputClass}
          type={type}
          value={value ?? ''}
          onChange={event => onChange(event.target.value)}
          placeholder={placeholder}
        />
        {filled && <Check className="customer-flow-check" />}
      </div>
      {hint && <small>{hint}</small>}
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: any;
  onChange: (value: string) => void;
  options: Array<[string, string]>;
}) {
  return (
    <label className="customer-flow-field">
      <span>{label}</span>
      <select className={inputClass} value={value ?? ''} onChange={event => onChange(event.target.value)}>
        {options.map(([key, text]) => (
          <option key={key} value={key}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`customer-flow-toggle ${checked ? 'is-active' : ''}`}
      aria-pressed={checked}
    >
      <span>{label}</span>
      <i>{checked ? <Check className="h-3 w-3" /> : null}</i>
    </button>
  );
}

export default function SaasCustomerEditor({ form, set, hideTaxIdForLegal = false }: Props) {
  const [step, setStep] = useState<Step>('identity');
  const personLabel = form.person_type === 'individual' ? 'Pessoa física' : form.person_type === 'foreign' ? 'Exterior' : 'Pessoa jurídica';
  const displayName = form.legal_name || form.trade_name || 'Novo cliente';
  const initials = String(displayName)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part: string) => part[0])
    .join('')
    .toUpperCase() || 'NC';

  const identityDone = Boolean(
    form.legal_name &&
      (form.person_type === 'foreign' ||
        (form.person_type === 'individual' ? onlyDigits(form.tax_id).length === 11 : onlyDigits(form.tax_id).length === 14))
  );
  const addressDone = Boolean(form.city && String(form.state || '').length === 2 && onlyDigits(form.city_ibge_code).length === 7);
  const contactDone = Boolean(form.email || form.phone || form.mobile);

  const progress = useMemo(() => {
    const checks = [identityDone, addressDone, contactDone];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [identityDone, addressDone, contactDone]);

  const steps: Array<{ id: Step; label: string; icon: any; done: boolean }> = [
    { id: 'identity', label: 'Identificação', icon: UserRound, done: identityDone },
    { id: 'address', label: 'Endereço', icon: MapPin, done: addressDone },
    { id: 'contact', label: 'Contato', icon: Mail, done: contactDone },
  ];

  return (
    <div className="customer-flow">
      <div className="customer-flow-progress">
        <div className="customer-flow-progress-head">
          <span>Cadastro do cliente</span>
          <b>{progress}%</b>
        </div>
        <div className="customer-flow-progress-track"><i style={{ width: `${progress}%` }} /></div>
        <div className="customer-flow-steps" role="tablist" aria-label="Etapas do cadastro">
          {steps.map(item => {
            const Icon = item.icon;
            return (
              <button
                type="button"
                key={item.id}
                className={`${step === item.id ? 'is-active' : ''} ${item.done ? 'is-done' : ''}`}
                onClick={() => setStep(item.id)}
                role="tab"
                aria-selected={step === item.id}
              >
                <i>{item.done ? <Check className="h-3 w-3" /> : <Icon className="h-3.5 w-3.5" />}</i>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="customer-flow-workspace">
        <div className="customer-flow-form">
          {step === 'identity' && (
            <section className="customer-flow-section">
              <div className="customer-flow-section-head">
                <div><UserRound /></div>
                <span>
                  <b>Identificação</b>
                  <small>Quem é este cliente e como ele será identificado nas emissões.</small>
                </span>
              </div>

              <div className="customer-flow-person-type">
                {[
                  ['legal', 'Pessoa jurídica', Building2],
                  ['individual', 'Pessoa física', UserRound],
                  ['foreign', 'Exterior', MapPin],
                ].map(([value, label, Icon]: any) => (
                  <button
                    type="button"
                    key={value}
                    onClick={() => set('person_type', value)}
                    className={form.person_type === value ? 'is-active' : ''}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>

              <div className="customer-flow-grid">
                <div className="customer-flow-span-2">
                  <Field
                    label={form.person_type === 'individual' ? 'Nome completo' : 'Razão social / nome'}
                    value={form.legal_name}
                    onChange={value => set('legal_name', value)}
                    required
                    placeholder={form.person_type === 'individual' ? 'Nome completo do cliente' : 'Razão social da empresa'}
                  />
                </div>
                {form.person_type !== 'individual' && (
                  <Field label="Nome fantasia" value={form.trade_name} onChange={value => set('trade_name', value)} placeholder="Como é conhecido comercialmente" />
                )}
                {(!hideTaxIdForLegal || form.person_type !== 'legal') && (
                  <Field
                    label={form.person_type === 'individual' ? 'CPF' : form.person_type === 'foreign' ? 'Documento' : 'CNPJ'}
                    value={form.person_type === 'foreign' ? form.tax_id : formatTaxId(form.tax_id, form.person_type)}
                    onChange={value => set('tax_id', onlyDigits(value))}
                    required
                    placeholder={form.person_type === 'individual' ? '000.000.000-00' : '00.000.000/0000-00'}
                    hint={form.person_type === 'foreign' ? 'Documento de identificação do exterior.' : undefined}
                  />
                )}
                <Field label="Nome do contato" value={form.contact_name} onChange={value => set('contact_name', value)} placeholder="Pessoa de referência" />
                <SelectField
                  label="Situação"
                  value={form.status}
                  onChange={value => set('status', value)}
                  options={[
                    ['active', 'Ativo'],
                    ['inactive', 'Inativo'],
                  ]}
                />
              </div>

              <div className="customer-flow-subsection">
                <div className="customer-flow-subsection-title">
                  <b>Dados fiscais</b>
                  <small>Usados automaticamente quando necessários na nota.</small>
                </div>
                <div className="customer-flow-grid">
                  <Field label="Inscrição estadual" value={form.state_registration} onChange={value => set('state_registration', value)} />
                  <Field label="Inscrição municipal" value={form.municipal_registration} onChange={value => set('municipal_registration', value)} />
                  <SelectField
                    label="Indicador IE"
                    value={form.ie_indicator}
                    onChange={value => set('ie_indicator', value)}
                    options={[
                      ['', 'Não informado'],
                      ['1', 'Contribuinte'],
                      ['2', 'Isento'],
                      ['9', 'Não contribuinte'],
                    ]}
                  />
                  <SelectField
                    label="Regime tributário"
                    value={form.tax_regime}
                    onChange={value => set('tax_regime', value)}
                    options={[
                      ['', 'Não informado'],
                      ['simples', 'Simples Nacional'],
                      ['presumido', 'Lucro Presumido'],
                      ['real', 'Lucro Real'],
                      ['mei', 'MEI'],
                    ]}
                  />
                </div>
                <div className="customer-flow-toggle-grid">
                  <Toggle label="Consumidor final" checked={!!form.final_consumer} onChange={value => set('final_consumer', value)} />
                  <Toggle label="Contribuinte ICMS" checked={!!form.icms_taxpayer} onChange={value => set('icms_taxpayer', value)} />
                </div>
              </div>
            </section>
          )}

          {step === 'address' && (
            <section className="customer-flow-section">
              <div className="customer-flow-section-head">
                <div><MapPin /></div>
                <span>
                  <b>Endereço</b>
                  <small>Endereço fiscal usado nos documentos com destinatário identificado.</small>
                </span>
              </div>
              <div className="customer-flow-grid">
                <Field label="CEP" value={formatCep(form.postal_code)} onChange={value => set('postal_code', onlyDigits(value))} placeholder="00000-000" />
                <Field label="Logradouro" value={form.street} onChange={value => set('street', value)} placeholder="Rua, avenida..." />
                <Field label="Número" value={form.street_number} onChange={value => set('street_number', value)} />
                <Field label="Complemento" value={form.complement} onChange={value => set('complement', value)} />
                <Field label="Bairro" value={form.district} onChange={value => set('district', value)} />
                <Field label="Cidade" value={form.city} onChange={value => set('city', value)} required />
                <Field label="UF" value={form.state} onChange={value => set('state', value)} required placeholder="AL" />
                <Field label="Código IBGE" value={form.city_ibge_code} onChange={value => set('city_ibge_code', value)} required hint="Código de 7 dígitos." />
              </div>
            </section>
          )}

          {step === 'contact' && (
            <section className="customer-flow-section">
              <div className="customer-flow-section-head">
                <div><Mail /></div>
                <span>
                  <b>Contato e observações</b>
                  <small>Canais de contato e informações internas para sua equipe.</small>
                </span>
              </div>
              <div className="customer-flow-grid">
                <Field label="E-mail" value={form.email} onChange={value => set('email', value)} type="email" placeholder="financeiro@empresa.com.br" />
                <Field label="E-mail fiscal" value={form.billing_email} onChange={value => set('billing_email', value)} type="email" placeholder="nfe@empresa.com.br" />
                <Field label="Telefone" value={form.phone} onChange={value => set('phone', value)} placeholder="(82) 0000-0000" />
                <Field label="WhatsApp" value={form.mobile} onChange={value => set('mobile', value)} placeholder="(82) 90000-0000" />
                <div className="customer-flow-span-2 customer-flow-notes">
                  <label>
                    <span>Observações internas</span>
                    <textarea rows={5} value={form.notes || ''} onChange={event => set('notes', event.target.value)} placeholder="Informações úteis para sua equipe. Não serão transmitidas na nota." />
                  </label>
                </div>
              </div>
            </section>
          )}
        </div>

        <aside className="customer-flow-summary">
          <div className="customer-flow-avatar">{initials}</div>
          <p className="customer-flow-summary-kicker">Cliente em cadastro</p>
          <h4>{displayName}</h4>
          <span className="customer-flow-summary-type">{personLabel}</span>

          <div className="customer-flow-summary-facts">
            <div><span>Documento</span><b>{form.tax_id ? formatTaxId(form.tax_id, form.person_type) : '—'}</b></div>
            <div><span>Localização</span><b>{[form.city, form.state].filter(Boolean).join(' / ') || '—'}</b></div>
            <div><span>Contato</span><b>{form.email || form.phone || form.mobile || '—'}</b></div>
            <div><span>Indicador IE</span><b>{({ '1': 'Contribuinte', '2': 'Isento', '9': 'Não contribuinte' } as any)[form.ie_indicator] || '—'}</b></div>
          </div>

          <div className="customer-flow-summary-status">
            <span>Pronto para salvar</span>
            <b>{identityDone && addressDone ? 'Sim' : 'Ainda não'}</b>
          </div>
          <p className="customer-flow-summary-note">Preencha identificação, cidade, UF e código IBGE para concluir o cadastro fiscal.</p>
        </aside>
      </div>

      <div className="customer-flow-next">
        {step !== 'identity' && <button type="button" onClick={() => setStep(step === 'contact' ? 'address' : 'identity')}>Voltar</button>}
        {step !== 'contact' && <button type="button" className="is-primary" onClick={() => setStep(step === 'identity' ? 'address' : 'contact')}>Continuar</button>}
      </div>
    </div>
  );
}
