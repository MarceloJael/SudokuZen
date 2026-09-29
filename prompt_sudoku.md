Atue como um Engenheiro de Software Sênior especialista em React, TypeScript, Performance no Browser e Arquitetura de Software. Vamos desenvolver um jogo de Sudoku robusto para navegadores e dispositivos móveis, priorizando arquitetura limpa, performance e acessibilidade (a11y).

### 1. Arquitetura e Motor do Jogo (Domain / Web Worker)
- **Separação de Preocupações:** Extraia toda a lógica de negócio, validação e algoritmos para um módulo puro (`sudokuEngine.ts`), totalmente desacoplado da interface React.
- **Geração e Backtracking:** Implemente a geração de tabuleiros preenchendo um grid 9x9 válido aleatoriamente e removendo números de forma a garantir solução única para 3 níveis de dificuldade: Fácil, Médio e Extremo.
- **Web Worker:** Mova o processo pesado de geração de tabuleiros e resolução por *backtracking* para um **Web Worker**, garantindo que a *main thread* do navegador nunca trave durante a criação dos níveis.
- **Testes Unitários:** Crie uma suíte de testes robusta usando **Vitest**, cobrindo o motor do jogo e casos de borda (tabuleiros impossíveis, validação de regras, unicidade de solução).

### 2. Tipagem Estrita (TypeScript)
- Defina tuplas de tamanho fixo para garantir em tempo de compilação que o grid e suas linhas/colunas tenham exatamente 9 elementos.
- Crie um tipo rígido para cada célula:
  `type CellState = { value: number | null; isFixed: boolean; hasError: boolean; notes: number[]; };`
  E para o grid: um array de 9 tuplas de 9 `CellState`.

### 3. Gerenciamento de Estado (Redux + Stack)
- Utilize **Redux Toolkit** para gerenciar o estado global contendo: `initialGrid`, `currentGrid`, e `solutionGrid`.
- Implemente um sistema de **Undo/Redo** utilizando uma estrutura de pilha (Stack) para rastrear o histórico de jogadas de forma eficiente.

### 4. Interface, Performance e UX (React)
- **Otimização de Re-render:** Utilize `React.memo` e seletores memoizados para garantir que apenas a célula alterada sofra re-renderização.
- **Interatividade Visual:** 
  - Ao focar/clicar em uma célula, destaque visualmente toda a sua linha e coluna correspondentes.
  - Ao clicar em um número, destaque todas as ocorrências idênticas desse número no tabuleiro.
- **Navegação por Teclado:** As setas direcionais do teclado DEVEM navegar pelas 81 células de forma fluida, lógica e intuitiva (com suporte a *wrapping* ou limites de borda).

### 5. Acessibilidade (a11y)
- Adicione suporte completo a *screen readers* (leitores de tela), anunciando de forma clara a linha, coluna, valor atual, notas e estado de erro de cada célula ao receber foco.

### 6. DevOps e Qualidade
- Configure um pipeline de **GitHub Actions** que execute automaticamente linters (ESLint/Prettier), testes unitários (Vitest) e realize o deploy contínuo da aplicação.