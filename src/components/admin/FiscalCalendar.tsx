import { useCallback, useEffect, useMemo, useState } from 'react';
import { Edit3, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

interface FiscalEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  category: string;
  status: 'upcoming' | 'today' | 'overdue' | 'completed';
  created_by: string;
  created_at: string;
}

const statusConfig = {
  completed: { label: 'Concluído', className: 'admin-status-green' },
  today: { label: 'Vence hoje', className: 'admin-status-blue' },
  overdue: { label: 'Atrasado', className: 'admin-status-red' },
  upcoming: { label: 'Pendente', className: 'admin-status-amber' },
};

const categoryLabels: Record<string, string> = {
  fiscal: 'Fiscal', contabil: 'Contábil', trabalhista: 'Trabalhista', geral: 'Geral',
};

const FiscalCalendar = () => {
  const [events, setEvents] = useState<FiscalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<FiscalEvent | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [formData, setFormData] = useState({ title: '', description: '', date: '', category: 'fiscal', status: 'upcoming' });
  const { toast } = useToast();

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('fiscal_events').select('*').order('date', { ascending: true });
      if (error) throw error;
      setEvents((data || []).map(event => ({ ...event, status: event.status as FiscalEvent['status'] })));
    } catch (error) {
      console.error('Erro ao buscar eventos:', error);
      toast({ title: 'Erro', description: 'Não foi possível carregar os eventos.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const resetForm = () => {
    setEditingEvent(null);
    setFormData({ title: '', description: '', date: '', category: 'fiscal', status: 'upcoming' });
  };

  const closeDialog = () => { setIsDialogOpen(false); resetForm(); };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.date) {
      toast({ title: 'Preencha os campos obrigatórios', description: 'Informe o título e a data do compromisso.', variant: 'destructive' });
      return;
    }
    try {
      const query = editingEvent
        ? supabase.from('fiscal_events').update(formData).eq('id', editingEvent.id)
        : supabase.from('fiscal_events').insert([formData]);
      const { error } = await query;
      if (error) throw error;
      toast({ title: editingEvent ? 'Compromisso atualizado' : 'Compromisso criado', description: 'A agenda fiscal foi atualizada com sucesso.' });
      await fetchEvents();
      closeDialog();
    } catch (error) {
      console.error('Erro ao salvar evento:', error);
      toast({ title: 'Erro', description: 'Não foi possível salvar o compromisso.', variant: 'destructive' });
    }
  };

  const handleDelete = async (eventId: string) => {
    if (!confirm('Deseja realmente excluir este compromisso?')) return;
    const { error } = await supabase.from('fiscal_events').delete().eq('id', eventId);
    if (error) {
      toast({ title: 'Erro', description: 'Não foi possível excluir o compromisso.', variant: 'destructive' });
      return;
    }
    toast({ title: 'Compromisso excluído', description: 'O item foi removido da agenda.' });
    fetchEvents();
  };

  const openEdit = (event: FiscalEvent) => {
    setEditingEvent(event);
    setFormData({ title: event.title, description: event.description || '', date: event.date, category: event.category, status: event.status });
    setIsDialogOpen(true);
  };

  const filteredEvents = useMemo(() => statusFilter === 'all' ? events : events.filter(event => event.status === statusFilter), [events, statusFilter]);
  const counts = {
    upcoming: events.filter(event => event.status === 'upcoming').length,
    today: events.filter(event => event.status === 'today').length,
    overdue: events.filter(event => event.status === 'overdue').length,
    completed: events.filter(event => event.status === 'completed').length,
  };

  if (loading) return <div className="flex min-h-[420px] items-center justify-center"><LoadingSpinner /></div>;

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <div>
          <p className="admin-eyebrow">Prazos e obrigações</p>
          <h1 className="admin-title">Agenda fiscal</h1>
          <p className="admin-subtitle">Controle vencimentos fiscais, contábeis e trabalhistas com uma visão objetiva de prioridade.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={open => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild><Button className="admin-button-primary h-9"><Plus className="mr-2 h-3.5 w-3.5" />Novo compromisso</Button></DialogTrigger>
          <DialogContent className="border-[var(--admin-line)] sm:max-w-[560px]">
            <DialogHeader><DialogTitle>{editingEvent ? 'Editar compromisso' : 'Novo compromisso'}</DialogTitle><DialogDescription>Cadastre a obrigação com data, categoria e situação atual.</DialogDescription></DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="space-y-1.5"><Label htmlFor="title">Título *</Label><Input id="title" value={formData.title} onChange={event => setFormData({ ...formData, title: event.target.value })} placeholder="Ex.: Vencimento do PGDAS" /></div>
              <div className="space-y-1.5"><Label htmlFor="description">Descrição</Label><Textarea id="description" value={formData.description} onChange={event => setFormData({ ...formData, description: event.target.value })} placeholder="Orientações ou observações internas" rows={3} /></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5"><Label htmlFor="date">Data *</Label><Input id="date" type="date" value={formData.date} onChange={event => setFormData({ ...formData, date: event.target.value })} /></div>
                <div className="space-y-1.5"><Label>Categoria</Label><Select value={formData.category} onValueChange={category => setFormData({ ...formData, category })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="fiscal">Fiscal</SelectItem><SelectItem value="contabil">Contábil</SelectItem><SelectItem value="trabalhista">Trabalhista</SelectItem><SelectItem value="geral">Geral</SelectItem></SelectContent></Select></div>
              </div>
              <div className="space-y-1.5"><Label>Situação</Label><Select value={formData.status} onValueChange={status => setFormData({ ...formData, status })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="upcoming">Pendente</SelectItem><SelectItem value="today">Vence hoje</SelectItem><SelectItem value="overdue">Atrasado</SelectItem><SelectItem value="completed">Concluído</SelectItem></SelectContent></Select></div>
              <div className="mt-2 flex justify-end gap-2"><Button variant="outline" className="admin-button-secondary" onClick={closeDialog}>Cancelar</Button><Button className="admin-button-primary" onClick={handleSave}>{editingEvent ? 'Salvar alterações' : 'Criar compromisso'}</Button></div>
            </div>
          </DialogContent>
        </Dialog>
      </header>

      <section className="admin-kpi-grid">
        <div className="admin-kpi"><p className="admin-kpi-label">Pendentes</p><p className="admin-kpi-value">{counts.upcoming}</p><p className="admin-kpi-meta">Aguardando conclusão</p></div>
        <div className="admin-kpi"><p className="admin-kpi-label">Vencem hoje</p><p className="admin-kpi-value">{counts.today}</p><p className="admin-kpi-meta">Prioridade imediata</p></div>
        <div className="admin-kpi"><p className="admin-kpi-label">Atrasados</p><p className="admin-kpi-value">{counts.overdue}</p><p className="admin-kpi-meta">Exigem regularização</p></div>
        <div className="admin-kpi"><p className="admin-kpi-label">Concluídos</p><p className="admin-kpi-value">{counts.completed}</p><p className="admin-kpi-meta">Itens finalizados</p></div>
      </section>

      <div className="admin-toolbar">
        <span className="mr-auto text-xs font-semibold text-[var(--admin-ink)]">Exibir compromissos</span>
        <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="h-9 w-full border-[var(--admin-line)] bg-transparent shadow-none sm:w-52"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas as situações</SelectItem><SelectItem value="upcoming">Pendentes</SelectItem><SelectItem value="today">Vencem hoje</SelectItem><SelectItem value="overdue">Atrasados</SelectItem><SelectItem value="completed">Concluídos</SelectItem></SelectContent></Select>
      </div>

      <section className="admin-surface">
        <div className="admin-surface-header"><div><h2 className="admin-section-title">Compromissos cadastrados</h2><p className="admin-section-description">{filteredEvents.length} {filteredEvents.length === 1 ? 'item na visualização' : 'itens na visualização'}.</p></div></div>
        <div className="admin-table-wrap">
          <table className="admin-data-table">
            <thead><tr><th>Vencimento</th><th>Compromisso</th><th>Categoria</th><th>Situação</th><th className="text-right">Ações</th></tr></thead>
            <tbody>
              {filteredEvents.length > 0 ? filteredEvents.map(event => {
                const status = statusConfig[event.status] || statusConfig.upcoming;
                return <tr key={event.id}><td className="whitespace-nowrap font-semibold tabular-nums">{new Date(`${event.date}T12:00:00`).toLocaleDateString('pt-BR')}</td><td><span className="block font-semibold">{event.title}</span>{event.description && <span className="mt-0.5 block max-w-[520px] truncate text-[11px] text-[var(--admin-muted)]">{event.description}</span>}</td><td>{categoryLabels[event.category] || event.category}</td><td><span className={`admin-status ${status.className}`}>{status.label}</span></td><td><div className="flex justify-end gap-1"><Button variant="ghost" size="icon" className="h-8 w-8 text-[var(--admin-muted)] hover:text-blue-600" onClick={() => openEdit(event)} aria-label="Editar"><Edit3 className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="icon" className="h-8 w-8 text-[var(--admin-muted)] hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30" onClick={() => handleDelete(event.id)} aria-label="Excluir"><Trash2 className="h-3.5 w-3.5" /></Button></div></td></tr>;
              }) : <tr><td colSpan={5}><div className="admin-empty"><strong className="text-sm text-[var(--admin-ink)]">Nenhum compromisso nesta visualização</strong><span className="mt-1 text-xs">Cadastre um novo prazo ou altere o filtro.</span></div></td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default FiscalCalendar;
