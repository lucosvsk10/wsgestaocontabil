import { useMemo, useState } from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatMinutes, type WorkHoursForm } from '@/lib/hr/workHours';

type EmployeeLike = {
  id: string;
  name: string;
};

export type MonthlyCalculationLike = {
  id: string;
  employee_id: string;
  competence: string;
  status: 'draft' | 'finalized';
  employee_name_snapshot: string;
  form_data: WorkHoursForm;
  result_data: any;
  updated_at?: string;
};

type Props = {
  companyName: string;
  employees: EmployeeLike[];
  history: MonthlyCalculationLike[];
  onOpen: (row: MonthlyCalculationLike) => void;
};

const MONTHS = [
  ['01', 'Jan'],
  ['02', 'Fev'],
  ['03', 'Mar'],
  ['04', 'Abr'],
  ['05', 'Mai'],
  ['06', 'Jun'],
  ['07', 'Jul'],
  ['08', 'Ago'],
  ['09', 'Set'],
  ['10', 'Out'],
  ['11', 'Nov'],
  ['12', 'Dez'],
] as const;

const currentYear = () => String(new Date().getFullYear());

const safeFileName = (value: string) =>
  String(value || 'empresa')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80) || 'empresa';

const monthOf = (competence: string) => String(competence || '').slice(5, 7);
const yearOf = (competence: string) => String(competence || '').slice(0, 4);

export default function MonthlyCalculationsTable({ companyName, employees, history, onOpen }: Props) {
  const availableYears = useMemo(() => {
    const years = new Set(history.map(row => yearOf(row.competence)).filter(Boolean));
    years.add(currentYear());
    return [...years].sort((a, b) => Number(b) - Number(a));
  }, [history]);

  const [year, setYear] = useState(currentYear);
  const [exporting, setExporting] = useState(false);

  const yearRows = useMemo(
    () => history.filter(row => yearOf(row.competence) === year),
    [history, year],
  );

  const people = useMemo(() => {
    const byId = new Map<string, { id: string; name: string }>();
    employees.forEach(employee => byId.set(employee.id, employee));
    yearRows.forEach(row => {
      if (!byId.has(row.employee_id)) {
        byId.set(row.employee_id, {
          id: row.employee_id,
          name: row.employee_name_snapshot || 'Funcionário',
        });
      }
    });
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [employees, yearRows]);

  const byEmployeeMonth = useMemo(() => {
    const map = new Map<string, MonthlyCalculationLike>();
    yearRows.forEach(row => map.set(`${row.employee_id}:${monthOf(row.competence)}`, row));
    return map;
  }, [yearRows]);

  const exportExcel = async () => {
    if (!yearRows.length) return;
    setExporting(true);
    try {
      const module = await import('xlsx-js-style');
      const XLSX: any = (module as any).default || module;

      const summaryData = people.map(person => {
        const row: Record<string, string | number> = { Funcionário: person.name };
        let annualTotal = 0;
        MONTHS.forEach(([month, label]) => {
          const calc = byEmployeeMonth.get(`${person.id}:${month}`);
          const total = calc ? Number(calc.result_data?.total || 0) : 0;
          row[label] = calc ? total : '';
          annualTotal += total;
        });
        row['Total ano'] = annualTotal;
        return row;
      });

      const detailData = yearRows
        .slice()
        .sort((a, b) => {
          const employeeCompare = a.employee_name_snapshot.localeCompare(b.employee_name_snapshot, 'pt-BR');
          return employeeCompare || a.competence.localeCompare(b.competence);
        })
        .map(row => ({
          Empresa: companyName,
          Funcionário: row.employee_name_snapshot,
          Competência: row.competence.slice(0, 7),
          Status: row.status === 'finalized' ? 'Finalizado' : 'Rascunho',
          'Salário / base': Number(row.result_data?.basePay || 0),
          'Valor da hora': Number(row.result_data?.hourlyRate || 0),
          'HE principal (horas)': formatMinutes(Number(row.result_data?.minutes?.overtime50 || 0)),
          'HE principal (R$)': Number(row.result_data?.additions?.overtime50 || 0),
          'HE especial (horas)': formatMinutes(Number(row.result_data?.minutes?.overtime100 || 0)),
          'HE especial (R$)': Number(row.result_data?.additions?.overtime100 || 0),
          'Adicional noturno (R$)': Number(row.result_data?.additions?.nightPremium || 0),
          'Domingo / feriado (R$)': Number(row.result_data?.additions?.holidayPremium || 0),
          'Faltas em dias (R$)': Number(row.result_data?.deductions?.absenceDays || 0),
          'Faltas em horas (R$)': Number(row.result_data?.deductions?.absenceHours || 0),
          'Atrasos (R$)': Number(row.result_data?.deductions?.lateHours || 0),
          'Banco positivo (R$)': Number(row.result_data?.additions?.bankPositive || 0),
          'Banco negativo (R$)': Number(row.result_data?.deductions?.bankNegative || 0),
          'Outros acréscimos (R$)': Number(row.result_data?.additions?.other || 0),
          'Outros descontos (R$)': Number(row.result_data?.deductions?.other || 0),
          'Total acréscimos': Number(row.result_data?.additionsTotal || 0),
          'Total descontos': Number(row.result_data?.deductionsTotal || 0),
          'Total apurado': Number(row.result_data?.total || 0),
          Atualizado: row.updated_at ? new Date(row.updated_at).toLocaleString('pt-BR') : '',
        }));

      const workbook = XLSX.utils.book_new();
      const summarySheet = XLSX.utils.json_to_sheet(summaryData);
      const detailSheet = XLSX.utils.json_to_sheet(detailData);

      summarySheet['!cols'] = [
        { wch: 34 },
        ...MONTHS.map(() => ({ wch: 14 })),
        { wch: 16 },
      ];
      detailSheet['!cols'] = [
        { wch: 28 },
        { wch: 30 },
        { wch: 12 },
        { wch: 12 },
        ...Array.from({ length: 18 }, () => ({ wch: 18 })),
        { wch: 20 },
      ];

      const styleHeader = (sheet: any) => {
        const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');
        for (let col = range.s.c; col <= range.e.c; col += 1) {
          const address = XLSX.utils.encode_cell({ r: 0, c: col });
          if (!sheet[address]) continue;
          sheet[address].s = {
            font: { bold: true },
            fill: { fgColor: { rgb: 'E7E7E7' } },
            alignment: { vertical: 'center' },
          };
        }
        sheet['!freeze'] = { xSplit: 1, ySplit: 1 };
      };

      styleHeader(summarySheet);
      styleHeader(detailSheet);

      const summaryRange = XLSX.utils.decode_range(summarySheet['!ref'] || 'A1:A1');
      for (let row = 1; row <= summaryRange.e.r; row += 1) {
        for (let col = 1; col <= summaryRange.e.c; col += 1) {
          const address = XLSX.utils.encode_cell({ r: row, c: col });
          if (summarySheet[address]?.t === 'n') summarySheet[address].z = 'R$ #,##0.00';
        }
      }

      const detailHeaders: string[] = [];
      for (let col = 0; col <= XLSX.utils.decode_range(detailSheet['!ref'] || 'A1:A1').e.c; col += 1) {
        const cell = detailSheet[XLSX.utils.encode_cell({ r: 0, c: col })];
        detailHeaders[col] = String(cell?.v || '');
      }
      const detailRange = XLSX.utils.decode_range(detailSheet['!ref'] || 'A1:A1');
      for (let row = 1; row <= detailRange.e.r; row += 1) {
        for (let col = 0; col <= detailRange.e.c; col += 1) {
          if (!detailHeaders[col].includes('R$') && !['Salário / base', 'Valor da hora', 'Total acréscimos', 'Total descontos', 'Total apurado'].includes(detailHeaders[col])) continue;
          const address = XLSX.utils.encode_cell({ r: row, c: col });
          if (detailSheet[address]?.t === 'n') detailSheet[address].z = 'R$ #,##0.00';
        }
      }

      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumo anual');
      XLSX.utils.book_append_sheet(workbook, detailSheet, 'Detalhado');
      XLSX.writeFile(
        workbook,
        `WS_Horas_${safeFileName(companyName)}_${year}.xlsx`,
        { compression: true },
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold">Cálculos por funcionário e mês</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Uma linha por funcionário. Clique em qualquer mês preenchido para abrir o cálculo.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="block">
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[.08em] text-muted-foreground">
              Ano
            </span>
            <select
              value={year}
              onChange={event => setYear(event.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              {availableYears.map(item => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void exportExcel()}
            disabled={!yearRows.length || exporting}
          >
            <Download className="mr-2 h-4 w-4" />
            {exporting ? 'Gerando...' : 'Exportar Excel'}
          </Button>
        </div>
      </div>

      {!yearRows.length ? (
        <div className="px-5 py-14 text-center">
          <FileSpreadsheet className="mx-auto h-7 w-7 text-muted-foreground" />
          <p className="mt-3 font-medium">Nenhum cálculo em {year}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Quando um rascunho ou cálculo for salvo, ele aparecerá no mês correspondente.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1500px] table-fixed text-left text-sm">
            <thead className="border-b border-border/60 bg-muted/15 text-[10px] uppercase tracking-[.08em] text-muted-foreground">
              <tr>
                <th className="sticky left-0 z-10 w-[240px] bg-card px-5 py-3 font-semibold">Funcionário</th>
                {MONTHS.map(([, label]) => (
                  <th key={label} className="w-[96px] px-2 py-3 text-center font-semibold">{label}</th>
                ))}
                <th className="w-[120px] px-3 py-3 text-right font-semibold">Total ano</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/45">
              {people.map(person => {
                const annualTotal = MONTHS.reduce((sum, [month]) => {
                  const calc = byEmployeeMonth.get(`${person.id}:${month}`);
                  return sum + Number(calc?.result_data?.total || 0);
                }, 0);

                return (
                  <tr key={person.id}>
                    <td className="sticky left-0 z-10 bg-card px-5 py-3 font-medium">{person.name}</td>
                    {MONTHS.map(([month]) => {
                      const calc = byEmployeeMonth.get(`${person.id}:${month}`);
                      return (
                        <td key={month} className="px-1.5 py-2 text-center">
                          {calc ? (
                            <button
                              type="button"
                              onClick={() => onOpen(calc)}
                              className="w-full rounded-md px-1.5 py-2 text-center transition hover:bg-muted/60 focus:outline-none focus:ring-2 focus:ring-ring"
                              title={calc.status === 'finalized' ? 'Finalizado' : 'Rascunho'}
                            >
                              <span className="block text-xs font-semibold tabular-nums">
                                {formatCurrency(Number(calc.result_data?.total || 0))}
                              </span>
                              <span className="mt-0.5 block text-[9px] text-muted-foreground">
                                {calc.status === 'finalized' ? 'Final' : 'Rascunho'}
                              </span>
                            </button>
                          ) : (
                            <span className="text-muted-foreground/40">—</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-3 py-3 text-right font-semibold tabular-nums">
                      {formatCurrency(annualTotal)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
