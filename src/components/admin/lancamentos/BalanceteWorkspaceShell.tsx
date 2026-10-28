import { BalanceteWorkspaceV2 } from "./BalanceteWorkspaceV2";

// Interface direta: cada aba já mostra o progresso e o resultado, sem popups globais
// que antes podiam informar "concluído" até quando a correção tinha falhado.
export function BalanceteWorkspaceShell() {
  return <BalanceteWorkspaceV2 />;
}
