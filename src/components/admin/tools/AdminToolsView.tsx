import React from 'react';
import { Calculator, FileText, PieChart, Building2, CreditCard, Images, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AdminPageHeader, AdminSection } from '@/components/admin/ui/AdminPage';

export const AdminToolsView: React.FC = () => {
 const navigate=useNavigate();
 const tools=[
  {title:'Simulador de IRPF',description:'Simulação de imposto de renda.',icon:Calculator,to:'/simulador-irpf'},
  {title:'Calculadora de INSS',description:'Contribuições do INSS por categoria.',icon:CreditCard,to:'/calculadora-inss'},
  {title:'Simulador de Pró-labore',description:'Simulação de valores líquidos de pró-labore.',icon:Building2,to:'/simulador-prolabore'},
  {title:'Carrossel',description:'Gerencie as empresas exibidas na página principal.',icon:Images,to:'/admin/carousel'},
  {title:'Enquetes',description:'Crie e acompanhe enquetes para clientes.',icon:PieChart,to:'/admin/polls'},
  {title:'Documentos dos clientes',description:'Envie e organize documentos da empresa ativa.',icon:FileText,to:'/admin/users'},
  {title:'Histórico de simulações',description:'Consulte as simulações realizadas.',icon:Calculator,to:'/admin/simulations'}
 ];
 return <div>
  <AdminPageHeader eyebrow="Administração" title="Ferramentas" description="Atalhos para utilitários e rotinas auxiliares do sistema."/>
  <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{tools.map(tool=>{const Icon=tool.icon;return <button key={tool.title} onClick={()=>navigate(tool.to)} className="group text-left"><AdminSection className="h-full p-5 transition hover:-translate-y-0.5 hover:border-border hover:shadow-md"><div className="flex items-start justify-between gap-4"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/45"><Icon className="h-5 w-5"/></span><ArrowUpRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"/></div><h3 className="mt-5 font-semibold">{tool.title}</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">{tool.description}</p></AdminSection></button>})}</div>
 </div>;
};
