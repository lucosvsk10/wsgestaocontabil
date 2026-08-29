import { useLocation } from "react-router-dom";
import { LayoutDashboard, FileText, PieChart, Calculator, Settings, Wrench, HardDrive, Megaphone, Calendar, Images, FileStack, LucideIcon, Building2, ReceiptText, Send } from "lucide-react";
interface SidebarItem { icon:LucideIcon; label:string; active:boolean; to:string; }
export interface SidebarSection { title:string; items:SidebarItem[]; }
export const useAdminSidebarNavigation=()=>{
 const location=useLocation();const active=(path:string)=>path==='/admin'?(location.pathname==='/admin'||location.pathname==='/admin/'):location.pathname.startsWith(path);
 const sidebarSections:SidebarSection[]=[
  {title:'Operação contábil',items:[{icon:LayoutDashboard,label:'Dashboard',active:active('/admin'),to:'/admin'},{icon:FileStack,label:'Lançamentos',active:active('/admin/lancamentos'),to:'/admin/lancamentos'},{icon:Calendar,label:'Agenda',active:active('/admin/agenda'),to:'/admin/agenda'},{icon:Calculator,label:'Simulações',active:active('/admin/simulations'),to:'/admin/simulations'}]},
  {title:'Fiscal',items:[{icon:ReceiptText,label:'Notas Fiscais',active:active('/admin/feature'),to:'/admin/feature'},{icon:Send,label:'Emissão fiscal',active:active('/admin/fiscal/emissao'),to:'/admin/fiscal/emissao'}]},
  {title:'Clientes do escritório',items:[{icon:Building2,label:'Clientes',active:active('/admin/clientes')||active('/admin/fiscal/empresas'),to:'/admin/clientes'},{icon:FileText,label:'Documentos dos clientes',active:active('/admin/documentos')||active('/admin/user-documents'),to:'/admin/documentos'},{icon:HardDrive,label:'Armazenamento',active:active('/admin/storage'),to:'/admin/storage'},{icon:Megaphone,label:'Anúncios',active:active('/admin/announcements'),to:'/admin/announcements'},{icon:PieChart,label:'Enquetes',active:active('/admin/polls'),to:'/admin/polls'}]},
  {title:'Administração',items:[{icon:Images,label:'Carrossel',active:active('/admin/carousel'),to:'/admin/carousel'},{icon:Wrench,label:'Ferramentas',active:active('/admin/tools'),to:'/admin/tools'},{icon:Settings,label:'Configurações',active:active('/admin/settings'),to:'/admin/settings'}]}
 ];
 return {sidebarSections,sidebarItems:sidebarSections.flatMap(section=>section.items),currentPath:location.pathname};
};
