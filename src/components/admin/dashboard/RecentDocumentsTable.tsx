import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
interface DocumentData {
  id: string;
  userName: string;
  name: string;
  uploaded_at: string;
}
interface RecentDocumentsTableProps {
  documents: DocumentData[];
  formatRecentDate: (date: string) => string;
}
export const RecentDocumentsTable = ({
  documents,
  formatRecentDate
}: RecentDocumentsTableProps) => {
  return <Card className="bg-white dark:bg-navy-medium border border-gray-200 dark:border-navy-lighter/30">
      <CardHeader className="border-b border-gray-200 dark:border-navy-lighter/30 bg-inherit">
        <CardTitle className="text-lg font-semibold text-navy dark:text-gold">
          Últimos documentos enviados
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-navy-lighter/30">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gold uppercase tracking-wider bg-gray-50 dark:bg-navy-deeper">Cliente</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gold uppercase tracking-wider bg-gray-50 dark:bg-navy-deeper">Documento</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gold uppercase tracking-wider bg-gray-50 dark:bg-navy-deeper">Data de envio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-navy-lighter/30">
              {documents.length > 0 ? documents.map(doc => <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-navy-deeper">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-navy dark:text-white">{doc.userName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{doc.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{formatRecentDate(doc.uploaded_at)}</td>
                  </tr>) : <tr>
                  <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    Nenhum documento recente encontrado
                  </td>
                </tr>}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>;
};