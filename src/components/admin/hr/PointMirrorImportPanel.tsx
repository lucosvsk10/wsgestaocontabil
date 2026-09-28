import { useState } from 'react';
import { FileUp, Loader2, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { readPointMirrorPdf, type PointMirrorEmployee } from '@/lib/hr/pointMirrorImport';
import { formatMinutes, weeklyScheduleMinutes } from '@/lib/hr/workHours';

type ExistingEmployee = {
  id: string;
  name: string;
  cpf: string | null;
};

type Props = {
  employees: ExistingEmployee[];
  onImport: (employees: PointMirrorEmployee[], fileName: string) => Promise<void>;
};

const formatCpf = (value: string) => {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 11);
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') || '—';
};

const formatDate = (value: string) => {
  if (!value) return '—';
  const [year, month, day] = value.split('-');
  return year && month && day ? day + '/' + month + '/' + year : value;
};

export default function PointMirrorImportPanel({ employees, onImport }: Props) {
  const [fileName, setFileName] = useState('');
  const [parsed, setParsed] = useState<PointMirrorEmployee[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const existingCpf = new Set(
    employees.map(employee => String(employee.cpf || '').replace(/\D/g, '')).filter(Boolean),
  );

  const readFile = async (file: File | null) => {
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setMessage('Selecione um arquivo PDF.');
      return;
    }

    setReading(true);
    setMessage('');
    setParsed([]);
    setWarnings([]);
    setFileName(file.name);

    try {
      const result = await readPointMirrorPdf(file);
      setParsed(result.employees);
      setWarnings(result.warnings);
      if (result.employees.length) {
        setMessage(
          result.employees.length +
            ' funcionário' +
            (result.employees.length === 1 ? '' : 's') +
            ' identificado' +
            (result.employees.length === 1 ? '' : 's') +
            '. Confira antes de importar.',
        );
      }
    } catch (error: any) {
      setMessage(error?.message || 'Não foi possível ler o PDF.');
    } finally {
      setReading(false);
    }
  };

  const confirm = async () => {
    if (!parsed.length) return;
    setSaving(true);
    setMessage('');
    try {
      await onImport(parsed, fileName);
      setMessage(
        'Importação concluída. Os funcionários e os rascunhos da competência já estão disponíveis no Controle.',
      );
      setParsed([]);
      setWarnings([]);
      setFileName('');
    } catch (error: any) {
      setMessage(error?.message || 'Não foi possível concluir a importação.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="border-b border-border/50 px-5 py-4">
        <h2 className="text-sm font-semibold">Importar espelho de ponto</h2>
        <p className="mt-1 max-w-3xl text-xs leading-5 text-muted-foreground">
          Use o PDF padrão “Relatório Espelho Ponto”. O sistema identifica os funcionários,
          cria ou complementa o mini cadastro, lê o período e as marcações e monta uma jornada
          semanal sugerida para conferência.
        </p>
      </div>

      <div className="p-5">
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/10 px-5 py-10 text-center transition hover:bg-muted/20">
          {reading ? (
            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
          ) : (
            <UploadCloud className="h-7 w-7 text-muted-foreground" />
          )}
          <span className="mt-3 text-sm font-medium">
            {reading ? 'Lendo o relatório...' : fileName || 'Selecionar PDF do espelho de ponto'}
          </span>
          <span className="mt-1 text-xs text-muted-foreground">
            O arquivo pode conter vários funcionários no mesmo relatório.
          </span>
          <input
            type="file"
            accept="application/pdf,.pdf"
            className="sr-only"
            disabled={reading || saving}
            onChange={event => void readFile(event.target.files?.[0] || null)}
          />
        </label>

        {message && (
          <div className="mt-4 rounded-lg border border-border/60 bg-muted/15 px-4 py-3 text-sm">
            {message}
          </div>
        )}

        {warnings.length > 0 && (
          <div className="mt-4 space-y-1 text-xs text-amber-700 dark:text-amber-300">
            {warnings.map((warning, index) => (
              <p key={index}>{warning}</p>
            ))}
          </div>
        )}

        {parsed.length > 0 && (
          <>
            <div className="mt-6 overflow-x-auto rounded-lg border border-border/60">
              <table className="w-full min-w-[1050px] text-left text-sm">
                <thead className="border-b border-border/60 bg-muted/15 text-[10px] uppercase tracking-[.08em] text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Funcionário</th>
                    <th className="px-4 py-3 font-semibold">CPF</th>
                    <th className="px-4 py-3 font-semibold">Matrícula</th>
                    <th className="px-4 py-3 font-semibold">Cargo</th>
                    <th className="px-4 py-3 font-semibold">Admissão</th>
                    <th className="px-4 py-3 font-semibold">Período</th>
                    <th className="px-4 py-3 font-semibold">Marcações</th>
                    <th className="px-4 py-3 font-semibold">Jornada sugerida</th>
                    <th className="px-4 py-3 font-semibold">Cadastro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/45">
                  {parsed.map(employee => {
                    const exists = existingCpf.has(employee.cpf);
                    const punchCount = employee.punches.reduce(
                      (sum, day) => sum + day.punches.length,
                      0,
                    );
                    const weekly = weeklyScheduleMinutes(employee.suggestedWeeklySchedule);
                    return (
                      <tr key={employee.cpf || employee.name}>
                        <td className="px-4 py-3">
                          <b className="block font-medium">{employee.name}</b>
                          <span className="text-xs text-muted-foreground">
                            {employee.employerName || 'Empresa não informada'}
                          </span>
                        </td>
                        <td className="px-4 py-3">{formatCpf(employee.cpf)}</td>
                        <td className="px-4 py-3">{employee.registration || '—'}</td>
                        <td className="px-4 py-3">{employee.role || '—'}</td>
                        <td className="px-4 py-3">{formatDate(employee.admissionDate)}</td>
                        <td className="px-4 py-3">
                          {formatDate(employee.periodStart)} — {formatDate(employee.periodEnd)}
                        </td>
                        <td className="px-4 py-3">
                          <b>{punchCount}</b>
                          <span className="ml-1 text-xs text-muted-foreground">
                            em {employee.punches.length} dias
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {weekly ? formatMinutes(weekly) + '/sem' : 'Revisar'}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-medium">
                            {exists ? 'Atualizar cadastro' : 'Novo cadastro'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-5 rounded-lg border border-border/60 bg-muted/10 px-4 py-3 text-xs leading-5 text-muted-foreground">
              A jornada semanal é uma <b className="text-foreground">sugestão baseada nas marcações recorrentes</b>.
              O PDF traz as batidas realizadas, não uma escala contratual detalhada; por isso ela continua editável
              na aba Jornada antes de finalizar qualquer cálculo.
            </div>

            <div className="mt-5 flex justify-end">
              <Button onClick={() => void confirm()} disabled={saving}>
                <FileUp className="mr-2 h-4 w-4" />
                {saving ? 'Importando...' : 'Importar ' + parsed.length + ' funcionário(s)'}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
