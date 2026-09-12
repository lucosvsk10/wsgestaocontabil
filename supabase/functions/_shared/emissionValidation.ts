// Pure validation shared by the form and Edge Functions; no runtime-specific dependencies.
export const onlyDigits = (value: unknown) => String(value ?? '').replace(/\D/g, '');

const repeatedDigits = (value: string) => /^([0-9])\1+$/.test(value);

export function isValidCpf(value: unknown) {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || repeatedDigits(cpf)) return false;

  let first = 0;
  let second = 0;
  for (let index = 0; index < 9; index += 1) {
    first += Number(cpf[index]) * (10 - index);
    second += Number(cpf[index]) * (11 - index);
  }
  const firstDigit = (first * 10) % 11 === 10 ? 0 : (first * 10) % 11;
  second += firstDigit * 2;
  const secondDigit = (second * 10) % 11 === 10 ? 0 : (second * 10) % 11;
  return firstDigit === Number(cpf[9]) && secondDigit === Number(cpf[10]);
}

export function isValidCnpj(value: unknown) {
  const cnpj = onlyDigits(value);
  if (cnpj.length !== 14 || repeatedDigits(cnpj)) return false;

  const calculate = (length: number) => {
    let sum = 0;
    let weight = length - 7;
    for (let index = 0; index < length; index += 1) {
      sum += Number(cnpj[index]) * weight;
      weight -= 1;
      if (weight === 1) weight = 9;
    }
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  return calculate(12) === Number(cnpj[12]) && calculate(13) === Number(cnpj[13]);
}

export function isValidTaxId(value: unknown) {
  const normalized = onlyDigits(value);
  return normalized.length === 11 ? isValidCpf(normalized) : isValidCnpj(normalized);
}

export function isValidAccessKey(value: unknown, models: string[] = ['55', '57', '58', '65']) {
  if (!/^[\d\s.-]+$/.test(String(value ?? ''))) return false;
  const key = onlyDigits(value);
  if (key.length !== 44 || /^0+$/.test(key) || !models.includes(key.slice(20, 22))) return false;

  let sum = 0;
  let weight = 2;
  for (let index = 42; index >= 0; index -= 1) {
    sum += Number(key[index]) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  const remainder = sum % 11;
  const expected = remainder < 2 ? 0 : 11 - remainder;
  return expected === Number(key[43]);
}

export const brazilStates = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
export const isPositiveAmount = (value: unknown) => Number.isFinite(Number(value)) && Number(value) > 0;
export const isDocumentNumber = (value: unknown, maxDigits = 9, allowZero = false) => {
  const text = String(value ?? '').trim();
  return new RegExp(`^\\d{1,${maxDigits}}$`).test(text) && (allowZero || Number(text) > 0);
};

/** One key per line, with common paste separators; never silently drop invalid entries. */
export function parseAccessKeys(value: unknown) {
  return String(value ?? '').split(/[\r\n,;\t ]+/).map(key => key.trim()).filter(Boolean);
}

export function validateMdfeKeys(value: unknown, issuerType: string) {
  const keys = parseAccessKeys(value);
  if (!keys.length) return 'Informe ao menos uma chave fiscal.';
  const model = issuerType === '2' ? '55' : '57';
  if (keys.some(key => !isValidAccessKey(key, [model]))) {
    return issuerType === '2'
      ? 'Carga própria: informe chaves válidas de NF-e (modelo 55).'
      : 'Prestação de transporte: informe chaves válidas de CT-e (modelo 57).';
  }
  if (new Set(keys).size !== keys.length) return 'Há chaves repetidas. Mantenha cada documento uma única vez.';
  return null;
}

