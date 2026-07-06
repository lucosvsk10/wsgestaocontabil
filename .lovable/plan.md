## Plano

Vou alterar a folha de pagamento para a IA não retornar lançamentos com diferença como se estivesse tudo certo. A regra passa a ser: se a IA não conseguir ler e montar os lançamentos mantendo exatamente os totais do PDF, o processamento não será aceito como concluído.

### 1. Trocar a estratégia do prompt
- Reescrever o prompt da folha para separar claramente duas tarefas:
  1. Ler o PDF e extrair os valores originais exatamente como aparecem.
  2. Só depois transformar esses valores em lançamentos contábeis.
- Remover qualquer linguagem que sugira “explicar divergência”, “conferência informativa” ou aceitar diferença.
- Exigir que cada lançamento traga a evidência do PDF na justificativa: verba original, seção e valor usado.
- Reforçar que a IA não pode inventar, omitir, arredondar, ajustar ou trocar centavos.

### 2. Usar modelo mais forte para leitura do PDF
- Trocar a chamada principal da folha de `google/gemini-2.5-flash` para `google/gemini-2.5-pro`, que é mais adequado para leitura multimodal/PDF com raciocínio mais cuidadoso.
- Manter uma chamada específica para totais oficiais do PDF, mas também com instrução mais rígida.

### 3. Validar como garantia de qualidade, não como “correção”
- Depois que a IA retornar os lançamentos, o sistema vai somar rendimentos e descontos.
- Se os totais dos lançamentos não baterem com os totais oficiais do documento, o upload ficará com `status = erro` e mensagem direta dizendo que a IA não leu o PDF corretamente.
- Não haverá ajuste automático, linha sintética, redistribuição, compensação ou auto-correção.
- O documento não será exportado com valores divergentes como se estivesse correto.

### 4. Remover observações inúteis de divergência
- Não salvar mais explicações longas da IA tentando justificar diferença.
- `observacoes_ia` ficará apenas para dúvidas reais de leitura, verba ilegível ou conta não encontrada.
- A tela não deve sugerir que “a IA lê exatamente” quando houve divergência.

### 5. Ajustar a tela do editor
- O painel “Conferência com o documento” volta a ser tratado como conferência real.
- Se houver divergência em dados antigos já processados, a tela deve mostrar que o arquivo precisa ser reprocessado/revisado, sem dizer que isso é aceitável.
- Remover o texto atual que diz que a conferência é apenas informativa.

## Resultado esperado

A IA só deve entregar folha processada quando os valores extraídos dos lançamentos forem iguais aos totais originais do PDF. Se ela não conseguir ler corretamente, o sistema deve rejeitar aquele processamento e pedir reprocessamento/revisão, sem inventar centavos e sem aceitar divergência.