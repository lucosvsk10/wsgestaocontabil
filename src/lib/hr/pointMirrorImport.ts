import { emptyWeeklySchedule, type WeekdayKey, type WeeklyDaySchedule } from './workHours';

export type ImportedPunchDay = {
  date: string;
  weekdayLabel: string;
  punches: string[];
};

export type PointMirrorEmployee = {
  name: string;
  cpf: string;
  registration: string;
  pis: string;
  admissionDate: string;
  role: string;
  department: string;
  employerName: string;
  employerCnpj: string;
  periodStart: string;
  periodEnd: string;
  bankHoursStartDate: string;
  scheduleLabel: string;
  punches: ImportedPunchDay[];
  suggestedWeeklySchedule: WeeklyDaySchedule[];
  sourcePage: number;
};

export type PointMirrorImportResult = {
  employees: PointMirrorEmployee[];
  warnings: string[];
};

const WEEKDAY_MAP: Record<string, WeekdayKey> = {
  Seg: 'monday',
  Ter: 'tuesday',
  Qua: 'wednesday',
  Qui: 'thursday',
  Sex: 'friday',
  Sab: 'saturday',
  Sáb: 'saturday',
  Dom: 'sunday',
};

const clean = (value: string) => String(value || '').replace(/\s+/g, ' ').trim();
const onlyDigits = (value: string) => String(value || '').replace(/\D/g, '');

const normalizeDate = (value: string) => {
  const raw = clean(value);
  const match = raw.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return match ? match[3] + '-' + match[2] + '-' + match[1] : '';
};

const escapeRegex = (value: string) => value.replace(/[.*+?^$()|[\]\\]/g, '\\$&');

const capture = (text: string, label: string, nextLabels: string[]) => {
  const next = nextLabels.map(escapeRegex).join('|');
  const re = new RegExp(
    escapeRegex(label) + '\\s*:\\s*(.*?)(?=\\s+(?:' + next + ')\\s*:|$)',
    'i',
  );
  return clean(text.match(re)?.[1] || '');
};

function medianClock(values: string[]) {
  const minutes = values
    .map(value => {
      const match = value.match(/^(\d{2}):(\d{2})$/);
      return match ? Number(match[1]) * 60 + Number(match[2]) : NaN;
    })
    .filter(Number.isFinite)
    .sort((a, b) => a - b) as number[];

  if (!minutes.length) return '';
  const mid = Math.floor(minutes.length / 2);
  const value = minutes.length % 2 ? minutes[mid] : Math.round((minutes[mid - 1] + minutes[mid]) / 2);
  return String(Math.floor(value / 60)).padStart(2, '0') + ':' + String(value % 60).padStart(2, '0');
}

export function inferWeeklySchedule(punches: ImportedPunchDay[]): WeeklyDaySchedule[] {
  const base = emptyWeeklySchedule().map(day => ({ ...day, active: false }));

  return base.map(day => {
    const matching = punches.filter(
      item => WEEKDAY_MAP[item.weekdayLabel] === day.key && item.punches.length >= 2,
    );
    if (!matching.length) return day;

    const first = matching.map(item => item.punches[0]).filter(Boolean);
    const last = matching.map(item => item.punches[item.punches.length - 1]).filter(Boolean);
    const middleOut = matching
      .filter(item => item.punches.length >= 4)
      .map(item => item.punches[1]);
    const middleIn = matching
      .filter(item => item.punches.length >= 4)
      .map(item => item.punches[item.punches.length - 2]);

    return {
      ...day,
      active: true,
      entry1: medianClock(first),
      exit1: middleOut.length ? medianClock(middleOut) : medianClock(last),
      entry2: middleIn.length ? medianClock(middleIn) : '',
      exit2: middleIn.length ? medianClock(last) : '',
    };
  });
}

export function parsePointMirrorPage(text: string, pageNumber = 1): PointMirrorEmployee | null {
  const flat = clean(text);
  if (!/Relat[oó]rio Espelho Ponto/i.test(flat) || !/Nome\s*:/i.test(flat) || !/CPF\s*:/i.test(flat)) {
    return null;
  }

  const labels = [
    'Nome', 'Matricula', 'Matrícula', 'Horário', 'Data de início BH', 'Cargo', 'Órgão Classe', 'CBO',
    'CPF', 'PIS', 'Data de Admissão', 'Departamento', 'Lotação', 'UF', 'Empresa', 'CNPJ',
    'Período consultado', 'Função', 'Especialidade', 'Número Órgão Classe',
  ];
  const get = (label: string) => capture(flat, label, labels.filter(item => item !== label));

  const name = get('Nome');
  const cpf = get('CPF');
  if (!name || !cpf) return null;

  const periodRaw = get('Período consultado');
  const periodDates = [...periodRaw.matchAll(/\d{2}\/\d{2}\/\d{4}/g)].map(match =>
    normalizeDate(match[0]),
  );

  const dayRe = /\b(Seg|Ter|Qua|Qui|Sex|Sab|Sáb|Dom)\s*-\s*(\d{2})\/(\d{2})\s*((?:(?:[01]\d|2[0-3]):[0-5]\d(?:\s+|$))*)/g;
  const punches: ImportedPunchDay[] = [];
  let match: RegExpExecArray | null;
  const year = periodDates[0]?.slice(0, 4) || String(new Date().getFullYear());

  while ((match = dayRe.exec(flat))) {
    const times = [...match[4].matchAll(/(?:[01]\d|2[0-3]):[0-5]\d/g)].map(item => item[0]);
    punches.push({
      weekdayLabel: match[1],
      date: year + '-' + match[3] + '-' + match[2],
      punches: times,
    });
  }

  return {
    name,
    cpf: onlyDigits(cpf),
    registration: get('Matricula') || get('Matrícula'),
    pis: onlyDigits(get('PIS')),
    admissionDate: normalizeDate(get('Data de Admissão')),
    role: get('Cargo') || get('Função'),
    department: get('Departamento'),
    employerName: get('Empresa'),
    employerCnpj: onlyDigits(get('CNPJ')),
    periodStart: periodDates[0] || '',
    periodEnd: periodDates[1] || '',
    bankHoursStartDate: normalizeDate(get('Data de início BH')),
    scheduleLabel: get('Horário'),
    punches,
    suggestedWeeklySchedule: inferWeeklySchedule(punches),
    sourcePage: pageNumber,
  };
}

function pageItemsToLines(items: any[]) {
  const rows = new Map<number, Array<{ x: number; text: string }>>();

  items.forEach((item: any) => {
    const text = clean(item?.str || '');
    if (!text) return;
    const x = Number(item?.transform?.[4] || 0);
    const y = Math.round(Number(item?.transform?.[5] || 0));
    const bucket = rows.get(y) || [];
    bucket.push({ x, text });
    rows.set(y, bucket);
  });

  return [...rows.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([, parts]) => parts.sort((a, b) => a.x - b.x).map(part => part.text).join(' '))
    .join('\n');
}

export async function readPointMirrorPdf(file: File): Promise<PointMirrorImportResult> {
  const pdfjs: any = await import('pdfjs-dist');
  const workerModule: any = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');

  if (pdfjs.GlobalWorkerOptions) {
    pdfjs.GlobalWorkerOptions.workerSrc = workerModule.default || workerModule;
  }

  const data = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data }).promise;
  const employees: PointMirrorEmployee[] = [];
  const warnings: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const pageContent = await page.getTextContent();
    const text = pageItemsToLines(pageContent.items || []);
    const parsed = parsePointMirrorPage(text, pageNumber);
    if (parsed) employees.push(parsed);
  }

  if (!employees.length) {
    warnings.push(
      'Nenhum funcionário foi identificado no PDF. Confirme se o arquivo segue o modelo Relatório Espelho Ponto.',
    );
  }

  const seen = new Set<string>();
  employees.forEach(employee => {
    const key = employee.cpf || employee.name.toLowerCase();
    if (seen.has(key)) warnings.push('Funcionário repetido no arquivo: ' + employee.name + '.');
    seen.add(key);
    if (!employee.punches.length) warnings.push('Sem marcações identificadas para ' + employee.name + '.');
  });

  return { employees, warnings };
}
