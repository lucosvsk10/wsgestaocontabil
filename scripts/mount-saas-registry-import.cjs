const fs = require('fs');
const path = 'src/components/saas/SaasCadastros.tsx';
let text = fs.readFileSync(path, 'utf8');
const anchor = "import { supabase } from '@/integrations/supabase/client';\n";
const importer = "import SaasRegistryImport from '@/components/saas/SaasRegistryImport';\n";
if (!text.includes(importer)) {
  if (!text.includes(anchor)) throw new Error('import anchor not found');
  text = text.replace(anchor, anchor + importer);
}
const oldBlock = `        <Button onClick={create} className="saas-action-primary">
          <Plus className="mr-2 h-4 w-4" />
          Novo {singular(section)}
        </Button>`;
const newBlock = `        <div className="flex flex-wrap items-center gap-2">
          <SaasRegistryImport
            organizationId={organizationId}
            defaultDestination={section}
            onImported={() => void load()}
          />
          <Button onClick={create} className="saas-action-primary">
            <Plus className="mr-2 h-4 w-4" />
            Novo {singular(section)}
          </Button>
        </div>`;
if (!text.includes(newBlock)) {
  if (!text.includes(oldBlock)) throw new Error('header action anchor not found');
  text = text.replace(oldBlock, newBlock);
}
fs.writeFileSync(path, text);
