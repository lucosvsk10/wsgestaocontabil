import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LinkItem } from './types';
interface LinksGridProps {
  links: LinkItem[];
  columns?: string;
}
const LinksGrid = ({
  links,
  columns = "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
}: LinksGridProps) => {
  return <div className={`grid ${columns} gap-4`}>
      {links.map(link => <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" className="block">
          <Card className="border-gold/20 h-full hover:border-gold/60 transition-colors bg-deepNavy-80">
            <CardHeader className="pb-2">
              <CardTitle className="text-navy-light dark:text-gold text-xl">{link.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-navy dark:text-gray-300">{link.description}</p>
            </CardContent>
          </Card>
        </a>)}
    </div>;
};
export default LinksGrid;