# Sudoku Zen — Design System (guia de implementação para Claude Code)

> Fonte única de verdade para a UI do jogo de Sudoku em React. Coloque este arquivo na raiz do repositório como `DESIGN.md` e referencie-o no `CLAUDE.md` (ex.: "Toda UI segue `DESIGN.md`"). Tudo aqui é implementável direto: tokens CSS completos, CSS de referência dos componentes, contratos de props (TypeScript), lógica do tabuleiro, mapa de teclado e checklist de acessibilidade.

---

## 0. Regras para o agente (leia antes de escrever código)

1. **Nunca use hex, rgb ou px "mágicos" em componentes.** Use apenas `var(--token)` desta especificação (ou as classes Tailwind mapeadas na §9). Se faltar um token, adicione-o em `tokens.css` nos três temas antes de usar.
2. **Componentes consomem tokens de papel** (`--color-cell-*`, `--color-key-*`, `--color-brand*`, `--color-text-*`), nunca tokens de outra categoria para "parecer igual".
3. **Três temas obrigatórios:** `light` (padrão), `dark`, `hc` (alto contraste). O tema é o atributo `data-theme` no `<html>`. Toda cor nova precisa de valor nos três e deve passar os contrastes da §8.
4. **Dígitos sempre tabulares:** `font-variant-numeric: tabular-nums lining-nums`.
5. **Cor nunca sozinha:** erro = cor + marcador de canto + `aria-invalid`; completo = cor + ✓; modo notas = `aria-pressed` + selo "on" + mudança no teclado.
6. **Movimento sutil e opcional:** toda animação some com `prefers-reduced-motion: reduce`.
7. **Layout responsivo por container query** (`container-type: inline-size`), não por media query de viewport.
8. **Textos da UI em português**, sentence case, sem exclamação, sem emoji.
9. Prefixo de classes CSS: `sz-` (BEM leve: `sz-cell`, `sz-cell__digit`, modificadores de estado `is-*`).

### Estrutura de arquivos sugerida

```
src/
  styles/
    tokens.css          # §2 — copie integralmente
    components.css      # §10 — CSS de referência
  sudoku/
    logic.ts            # §6 — peers, conflitos, contagens, unidades
    types.ts            # §5 — contratos de props
  components/
    Icon.tsx
    Button.tsx
    IconButton.tsx
    SudokuCell.tsx
    SudokuBoard.tsx
    NumberPad.tsx
    VictoryPanel.tsx
    SudokuGame.tsx      # composição + estado (useReducer recomendado)
```

Fontes (no `index.html`):

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
```

---

## 1. Princípios

1. **O tabuleiro é a tela.** Tudo fora dele usa `--color-text-secondary`, pesos baixos e nenhum fill de cor. Só um elemento por tela usa `--color-brand` como fill (o botão primário).
2. **Destaque em camadas, nunca em ruído.** Contexto (`--color-cell-bg-related`) < mesmo número (`--color-cell-bg-same-value`) < seleção (`--color-cell-bg-selected`). Cada camada é um passo de luminosidade, não uma cor nova.
3. **Nada salta.** Algarismos tabulares, cronômetro em mono, tamanhos que escalam com o tabuleiro (`cqi`).
4. **Cor nunca sozinha** (ver regra 5).

Voz: "Resolvido", "Novo jogo", "Restam 3", "Erros 2" (nunca "Você errou"). Verbos no infinitivo para ações ("Desfazer", "Apagar"), substantivos para modos ("Notas", "Dica").

---

## 2. Design tokens — `tokens.css` (copiar integralmente)

Nomenclatura: `<categoria>-<papel>-<variante>` em kebab-case. Aliases (`var(--color-brand)`) permitem re-tematizar sem tocar nos componentes — nos temas `dark`/`hc` só os valores-base mudam.

```css
:root {
  /* spacing */
  --space-0-5: 2px;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-12: 48px;
  --space-16: 64px;
  /* radius */
  --radius-none: 0px;
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 20px;
  --radius-full: 999px;
  /* size */
  --size-board-max: 540px;
  --size-board-min: 288px;
  --size-panel: 320px;
  --size-touch-min: 44px;
  --size-control-md: 40px;
  --size-control-lg: 48px;
  --size-key: 56px;
  --breakpoint-md: 760px;
  --breakpoint-sm: 400px;
  /* border */
  --border-cell: 1px;
  --border-box: 2px;
  --border-board: 2px;
  --focus-ring-width: 2px;
  --focus-ring-offset: 2px;
  /* duration */
  --duration-instant: 80ms;
  --duration-fast: 140ms;
  --duration-base: 220ms;
  --duration-slow: 360ms;
  --duration-celebrate: 900ms;
  /* easing */
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);
  --ease-emphasized: cubic-bezier(0.3, 0, 0, 1.3);
  --ease-exit: cubic-bezier(0.4, 0, 1, 1);
  /* zIndex */
  --z-board: 1;
  --z-sticky: 10;
  --z-overlay: 100;
  /* fontes */
  --font-sans: Manrope, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-digits: Manrope, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace;
}

/* Light (padrão) */
:root, [data-theme="light"] {
  --color-bg-app: #f5f3ee;
  --color-surface: #ffffff;
  --color-surface-raised: #ffffff;
  --color-surface-sunken: #ebe8e1;
  --color-overlay: rgba(20, 22, 21, 0.40);
  --color-border-subtle: #e1ddd4;
  --color-border-default: #8f8a80;
  --color-border-strong: #34332f;
  --color-text-primary: #1e1d1a;
  --color-text-secondary: #5c5850;
  --color-text-disabled: #a19c92;
  --color-brand: #2a6356;
  --color-brand-hover: #22544a;
  --color-brand-active: #1a453c;
  --color-brand-soft: #dcebe6;
  --color-text-on-brand: #ffffff;
  --color-success: #1f5f7a;
  --color-success-soft: #dcecf3;
  --color-error: #b3261e;
  --color-error-soft: #fbe4df;
  --color-hint: #8a5a00;
  --color-hint-soft: #f8ecd2;
  --color-cell-bg: var(--color-surface);
  --color-cell-bg-related: #efece5;
  --color-cell-bg-same-value: #d4e6e0;
  --color-cell-bg-selected: #b9d9d0;
  --color-cell-bg-error: var(--color-error-soft);
  --color-cell-bg-hint: var(--color-hint-soft);
  --color-cell-bg-complete: var(--color-success-soft);
  --color-cell-text-given: var(--color-text-primary);
  --color-cell-text-user: var(--color-brand);
  --color-cell-text-error: var(--color-error);
  --color-cell-text-note: var(--color-text-secondary);
  --color-cell-text-note-match: var(--color-brand);
  --color-cell-border: #dcd8cf;
  --color-box-border: var(--color-border-strong);
  --color-key-bg: var(--color-surface);
  --color-key-bg-hover: #eef3f1;
  --color-key-bg-active: var(--color-brand-soft);
  --color-key-text: var(--color-brand);
  --color-key-count: var(--color-text-secondary);
  --color-key-bg-complete: var(--color-surface-sunken);
  --color-key-text-complete: var(--color-text-disabled);
  --color-focus-ring: #1a5fb4;
  --shadow-board: 0 1px 2px rgba(30, 29, 26, 0.06), 0 8px 24px rgba(30, 29, 26, 0.06);
  --shadow-modal: 0 24px 64px rgba(30, 29, 26, 0.18);
  --shadow-key: 0 1px 0 rgba(30, 29, 26, 0.08);
}

/* Dark — só o que muda; aliases (var(--…)) herdam */
[data-theme="dark"] {
  --color-bg-app: #121413;
  --color-surface: #1b1e1d;
  --color-surface-raised: #232726;
  --color-surface-sunken: #0e100f;
  --color-overlay: rgba(0, 0, 0, 0.60);
  --color-border-subtle: #2b2f2d;
  --color-border-default: #6b716e;
  --color-border-strong: #9aa19d;
  --color-text-primary: #ecebe6;
  --color-text-secondary: #b6bab6;
  --color-text-disabled: #5d625f;
  --color-brand: #7fc7b7;
  --color-brand-hover: #98d4c6;
  --color-brand-active: #b1dfd4;
  --color-brand-soft: #1d3531;
  --color-text-on-brand: #0d1a17;
  --color-success: #86c6e0;
  --color-success-soft: #16303b;
  --color-error: #ff9585;
  --color-error-soft: #3b1f1b;
  --color-hint: #f0c36a;
  --color-hint-soft: #3a2f17;
  --color-cell-bg-related: #282d2b;
  --color-cell-bg-same-value: #213d38;
  --color-cell-bg-selected: #2c5049;
  --color-cell-border: #2e3230;
  --color-key-bg-hover: #252a29;
  --color-focus-ring: #8ab8ff;
  --shadow-board: 0 1px 2px rgba(0, 0, 0, 0.4);
  --shadow-modal: 0 24px 64px rgba(0, 0, 0, 0.6);
  --shadow-key: 0 1px 0 rgba(0, 0, 0, 0.5);
}

/* Alto contraste (AAA) — só o que muda; aliases (var(--…)) herdam */
[data-theme="hc"] {
  --color-bg-app: #ffffff;
  --color-surface: #ffffff;
  --color-surface-raised: #ffffff;
  --color-surface-sunken: #f0f0f0;
  --color-overlay: rgba(0, 0, 0, 0.70);
  --color-border-subtle: #8a8a8a;
  --color-border-default: #000000;
  --color-border-strong: #000000;
  --color-text-primary: #000000;
  --color-text-secondary: #262626;
  --color-text-disabled: #6e6e6e;
  --color-brand: #004438;
  --color-brand-hover: #00302a;
  --color-brand-active: #001f1a;
  --color-brand-soft: #d2efe8;
  --color-text-on-brand: #ffffff;
  --color-success: #00405c;
  --color-success-soft: #cfe8f5;
  --color-error: #8a0000;
  --color-error-soft: #ffe0e0;
  --color-hint: #5c3b00;
  --color-hint-soft: #fff0c2;
  --color-cell-bg-related: #e6e6e6;
  --color-cell-bg-same-value: #bfe9de;
  --color-cell-bg-selected: #ffe45c;
  --color-cell-border: #8a8a8a;
  --color-key-bg-hover: #e6e6e6;
  --color-focus-ring: #0038d6;
  --shadow-board: none;
  --shadow-modal: none;
  --shadow-key: none;
}
```

### Troca de tema (JS)

```ts
type Theme = 'light' | 'dark' | 'hc';

export function applyTheme(theme: Theme, animate = true) {
  const root = document.documentElement;
  if (animate && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    root.classList.add('sz-theme-anim');
    window.setTimeout(() => root.classList.remove('sz-theme-anim'), 250);
  }
  root.dataset.theme = theme;
  localStorage.setItem('sz-theme', theme);
}

// Inicialização: escolha salva > preferência do sistema
export function initialTheme(): Theme {
  const saved = localStorage.getItem('sz-theme') as Theme | null;
  if (saved) return saved;
  if (matchMedia('(prefers-contrast: more)').matches) return 'hc';
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
```

### Referência de cores (Light · Dark · Alto contraste)

| Token | Light | Dark | HC | Uso |
| --- | --- | --- | --- | --- |
| `--color-bg-app` | `#f5f3ee` | `#121413` | `#ffffff` | Fundo da página/app. Papel quente no Light, grafite no Dark. |
| `--color-surface` | `#ffffff` | `#1b1e1d` | `#ffffff` | Superfície base: painel lateral, células do tabuleiro, teclado numérico. |
| `--color-surface-raised` | `#ffffff` | `#232726` | `#ffffff` | Modais e popovers (diálogo de vitória, menu de dificuldade). |
| `--color-surface-sunken` | `#ebe8e1` | `#0e100f` | `#f0f0f0` | Trilhas, fundo de segmented controls, estado pressionado de botões ghost. |
| `--color-overlay` | `rgba(20, 22, 21, 0.40)` | `rgba(0, 0, 0, 0.60)` | `rgba(0, 0, 0, 0.70)` | Scrim atrás de modais. |
| `--color-border-subtle` | `#e1ddd4` | `#2b2f2d` | `#8a8a8a` | Divisórias decorativas e borda de cards. Não carrega significado. |
| `--color-border-default` | `#8f8a80` | `#6b716e` | `#000000` | Borda de controles (botão secundário, inputs): ≥3:1 sobre color-surface. |
| `--color-border-strong` | `#34332f` | `#9aa19d` | `#000000` | Bordas grossas das subgrades 3×3 e contorno do tabuleiro: ≥3:1 sobre todos os fundos de célula. |
| `--color-text-primary` | `#1e1d1a` | `#ecebe6` | `#000000` | Texto principal e dígitos fixos. Sobre color-bg-app, color-surface e todos os color-cell-bg-*. |
| `--color-text-secondary` | `#5c5850` | `#b6bab6` | `#262626` | Metadados, rótulos, timer, pencil marks. Sobre color-bg-app, color-surface e todos os color-cell-bg-*. |
| `--color-text-disabled` | `#a19c92` | `#5d625f` | `#6e6e6e` | Controles desativados (isentos de contraste WCAG); sempre acompanhado de outro sinal (ícone/opacidade de fundo). |
| `--color-brand` | `#2a6356` | `#7fc7b7` | `#004438` | Ação principal, dígitos inseridos pelo usuário, foco. Como texto, sobre color-surface e todos os color-cell-bg-*. |
| `--color-brand-hover` | `#22544a` | `#98d4c6` | `#00302a` | Hover do botão primário. |
| `--color-brand-active` | `#1a453c` | `#b1dfd4` | `#001f1a` | Pressionado (active) do botão primário. |
| `--color-brand-soft` | `#dcebe6` | `#1d3531` | `#d2efe8` | Fundo tintado: botão de ícone ativo (modo notas ligado), chips. |
| `--color-text-on-brand` | `#ffffff` | `#0d1a17` | `#ffffff` | Texto e ícones sobre fill color-brand (rótulo do botão primário). |
| `--color-success` | `#1f5f7a` | `#86c6e0` | `#00405c` | Acerto/conclusão (vitória, linha/bloco completo). Azul-petróleo, fora do eixo vermelho–verde; sempre com ícone ✓ ou texto. |
| `--color-success-soft` | `#dcecf3` | `#16303b` | `#cfe8f5` | Flash de conclusão de linha/coluna/bloco e fundo do selo de vitória. |
| `--color-error` | `#b3261e` | `#ff9585` | `#8a0000` | Dígito em conflito e mensagens de validação. Sobre color-cell-bg-error e color-surface; sempre com marcador de canto (não depende só da cor). |
| `--color-error-soft` | `#fbe4df` | `#3b1f1b` | `#ffe0e0` | Fundo de célula em conflito. |
| `--color-hint` | `#8a5a00` | `#f0c36a` | `#5c3b00` | Dígito revelado por dica. Sobre color-cell-bg-hint e color-surface. |
| `--color-hint-soft` | `#f8ecd2` | `#3a2f17` | `#fff0c2` | Fundo da célula revelada por dica (esmaece em 1,2s para color-cell-bg). |
| `--color-cell-bg` | `{color-surface}` | `{color-surface}` | `{color-surface}` | Fundo padrão da célula. |
| `--color-cell-bg-related` | `#efece5` | `#282d2b` | `#e6e6e6` | Linha, coluna e bloco 3×3 da célula selecionada (destaque contextual suave). |
| `--color-cell-bg-same-value` | `#d4e6e0` | `#213d38` | `#bfe9de` | Células com o mesmo número da célula selecionada. |
| `--color-cell-bg-selected` | `#b9d9d0` | `#2c5049` | `#ffe45c` | Célula selecionada. Vence related e same-value. |
| `--color-cell-bg-error` | `{color-error-soft}` | `{color-error-soft}` | `{color-error-soft}` | Célula em conflito de regra (vence related/same-value; selecionada recebe anel color-focus-ring). |
| `--color-cell-bg-hint` | `{color-hint-soft}` | `{color-hint-soft}` | `{color-hint-soft}` | Célula recém-revelada por dica. |
| `--color-cell-bg-complete` | `{color-success-soft}` | `{color-success-soft}` | `{color-success-soft}` | Flash de 600ms numa unidade (linha/coluna/bloco) recém-completada. |
| `--color-cell-text-given` | `{color-text-primary}` | `{color-text-primary}` | `{color-text-primary}` | Dígito fixo (pista inicial): peso 600. |
| `--color-cell-text-user` | `{color-brand}` | `{color-brand}` | `{color-brand}` | Dígito inserido pelo usuário: peso 500, cor de marca. |
| `--color-cell-text-error` | `{color-error}` | `{color-error}` | `{color-error}` | Dígito em conflito. |
| `--color-cell-text-note` | `{color-text-secondary}` | `{color-text-secondary}` | `{color-text-secondary}` | Pencil marks (notas). |
| `--color-cell-text-note-match` | `{color-brand}` | `{color-brand}` | `{color-brand}` | Nota igual ao número selecionado: mesma cor de marca, peso 700. |
| `--color-cell-border` | `#dcd8cf` | `#2e3230` | `#8a8a8a` | Linhas finas entre células (decorativas; as subgrades carregam a estrutura com color-border-strong). |
| `--color-box-border` | `{color-border-strong}` | `{color-border-strong}` | `{color-border-strong}` | Bordas das subgrades 3×3 e contorno do tabuleiro. |
| `--color-key-bg` | `{color-surface}` | `{color-surface}` | `{color-surface}` | Tecla do teclado numérico. |
| `--color-key-bg-hover` | `#eef3f1` | `#252a29` | `#e6e6e6` | Tecla em hover. |
| `--color-key-bg-active` | `{color-brand-soft}` | `{color-brand-soft}` | `{color-brand-soft}` | Tecla pressionada. |
| `--color-key-text` | `{color-brand}` | `{color-brand}` | `{color-brand}` | Dígito da tecla. |
| `--color-key-count` | `{color-text-secondary}` | `{color-text-secondary}` | `{color-text-secondary}` | Contador de restantes na tecla. |
| `--color-key-bg-complete` | `{color-surface-sunken}` | `{color-surface-sunken}` | `{color-surface-sunken}` | Tecla de número já completo (9/9). |
| `--color-key-text-complete` | `{color-text-disabled}` | `{color-text-disabled}` | `{color-text-disabled}` | Dígito da tecla completa, com ícone ✓ no lugar do contador. |
| `--color-focus-ring` | `#1a5fb4` | `#8ab8ff` | `#0038d6` | Anel de foco de teclado (2px sólido). Azul distinto da marca para não se confundir com seleção; ≥3:1 sobre todos os fundos. |

---

## 3. Tipografia

- **Manrope** (400–800) para interface e dígitos; **JetBrains Mono** 500 só no cronômetro/contadores. Fallback `system-ui`.
- Dígitos: `font-variant-numeric: tabular-nums lining-nums; font-feature-settings: "tnum" 1, "lnum" 1;`
- Os estilos do tabuleiro são referência a 540px de tabuleiro; **em código escalam com o tabuleiro**: dígito `font-size: 5.6cqi` (~56% da célula), notas `font-size: max(8px, 2cqi)`.

| Estilo | Família | Tamanho | Line-height | Peso | Tracking | Uso |
| --- | --- | --- | --- | --- | --- | --- |
| `cell-digit-given` | digits | 30px | 1 | 600 | 0 | Dígito fixo. Em código: font-size 5.6cqi do tabuleiro (≈ 56% da célula). |
| `cell-digit-user` | digits | 30px | 1 | 500 | 0 | Dígito do usuário: mesma métrica, peso 500 + color-cell-text-user. |
| `cell-note` | digits | 11px | 1 | 600 | 0 | Pencil marks em grade 3×3. Em código: 2cqi, mínimo 8px. |
| `key-digit` | digits | 26px | 1 | 600 | 0 | Dígito da tecla do teclado numérico. |
| `key-count` | digits | 11px | 14px | 600 | 0 | Contador de restantes sob o dígito da tecla. |
| `display` | sans | 32px | 40px | 700 | -0.02em | Título do diálogo de vitória. |
| `title` | sans | 20px | 28px | 700 | -0.01em | Títulos de painel e modal. |
| `body` | sans | 15px | 22px | 400 | 0 | Texto corrido. |
| `label` | sans | 14px | 20px | 600 | 0 | Rótulos de botões e controles. |
| `caption` | sans | 12px | 16px | 500 | 0.02em | Metadados e legendas sob ícones. |
| `timer` | mono | 16px | 24px | 500 | 0 | Cronômetro e contagem de erros; mono para não 'pular' a cada segundo. |

Diferença fixo × usuário: fixo = `--color-cell-text-given` peso **600**; usuário = `--color-cell-text-user` (marca) peso **500**. Muda cor **e** peso.

---

## 4. Espaçamento, grid e forma

- Escala base 4px: `--space-0-5` 2 · `--space-1` 4 · `--space-2` 8 · `--space-3` 12 · `--space-4` 16 · `--space-5` 20 · `--space-6` 24 · `--space-8` 32 · `--space-12` 48 · `--space-16` 64. Layout em múltiplos de 8; 4 só para ajuste interno.
- **Tabuleiro:** quadrado (`aspect-ratio: 1`), de `--size-board-min` (288px) a `--size-board-max` (540px = 60px/célula). `display: grid; grid-template-columns: repeat(9, 1fr); grid-template-rows: repeat(9, 1fr)`.
- **Hierarquia de linhas (subgrades 3×3):**
  - entre células: `--border-cell` (1px) `--color-cell-border`
  - após colunas/linhas de índice 2 e 5 (0-based): `--border-box` (2px) `--color-box-border`
  - contorno: `--border-board` (2px) `--color-box-border` + `--radius-md` + `--shadow-board`
  - última coluna/linha sem borda direita/inferior (o contorno cobre)
- Raios: `--radius-none` células · `--radius-md` botões, teclas, tabuleiro · `--radius-lg` cards · `--radius-xl` modais · `--radius-full` selos/pills.
- Sombras só em `light`/`dark`; no `hc` são `none` e bordas fazem o trabalho.
- Alvos de toque ≥ `--size-touch-min` (44px); teclas ≥ 52px.

---

## 5. Componentes — contratos (TypeScript)

```ts
import type * as React from 'react';
// Contratos de props. Cada componente é `export function X(props: XProps): JSX.Element`.

/** Índice 0–80 (linha * 9 + coluna). Valores 0 = vazio. */
export type CellIndex = number;
export type Digit = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
/** 81 dígitos: string ("530070000…", "." ou "0" = vazio) ou array de números. */
export type Grid = string | number[];
export type IconName = 'undo' | 'redo' | 'erase' | 'hint' | 'notes' | 'check' | 'pause' | 'restart' | 'sun' | 'moon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** primary: uma vez por tela. secondary: padrão. ghost: ações terciárias. */
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'md' | 'lg';
  icon?: IconName;
  block?: boolean;
}
// export function Button(props: ButtonProps)

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName;
  /** Obrigatório: vira aria-label, title e a legenda visível. */
  label: string;
  /** Toggle (ex.: modo notas). Define aria-pressed. */
  pressed?: boolean;
  /** Contador/selo no canto (dicas restantes, "on"). */
  badge?: React.ReactNode;
  /** false esconde a legenda (mantém aria-label). Padrão true. */
  showLabel?: boolean;
}
// export function IconButton(props: IconButtonProps)

export interface SudokuCellProps {
  index: CellIndex;
  value?: number;
  given?: boolean;
  notes?: Digit[] | null;
  selected?: boolean;
  related?: boolean;
  sameValue?: boolean;
  error?: boolean;
  hint?: boolean;
  flash?: boolean;
  shake?: boolean;
  /** Dígito selecionado: a nota igual fica destacada. */
  noteMatch?: number;
  animate?: boolean;
  tabIndex?: number;
  onSelect?: (index: CellIndex) => void;
}
// export function SudokuCell(props: SudokuCellProps)

export interface SudokuBoardProps {
  /** Pistas iniciais (células fixas). */
  givens: Grid;
  /** Estado atual; padrão = givens. */
  values?: Grid;
  /** notes[i] = dígitos de rascunho da célula i. */
  notes?: (Digit[] | undefined)[];
  selected?: CellIndex | null;
  /** Conflitos; se omitido, calculados pelas regras (linha/coluna/bloco). */
  errors?: CellIndex[] | Record<number, 1>;
  hints?: CellIndex[];
  flash?: CellIndex[];
  shake?: CellIndex;
  won?: boolean;
  highlightRelated?: boolean;
  highlightSameValue?: boolean;
  animate?: boolean;
  label?: string;
  onSelect?: (index: CellIndex) => void;
  onInput?: (digit: Digit) => void;
  onErase?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onToggleNotes?: () => void;
  onHint?: () => void;
  className?: string;
  style?: React.CSSProperties;
}
// export function SudokuBoard(props: SudokuBoardProps)

export interface NumberPadProps {
  /** counts[d] = quantas vezes d já está no tabuleiro (índice 0 ignorado). */
  counts?: number[];
  /** Alternativa a counts. */
  values?: Grid;
  onPick?: (digit: Digit) => void;
  notesMode?: boolean;
  /** Dígito da célula selecionada (borda de marca). */
  current?: number;
  /** row = 9 em linha (mobile); grid = 3×3 (painel desktop). */
  layout?: 'row' | 'grid' | 'auto';
  showCount?: boolean;
  disabled?: boolean;
  className?: string;
}
// export function NumberPad(props: NumberPadProps)

export interface VictoryPanelProps {
  open?: boolean;
  /** true = renderiza só o card, sem scrim (para docs). */
  inline?: boolean;
  /** Segundos. */
  time?: number;
  mistakes?: number;
  hints?: number;
  difficulty?: string;
  title?: string;
  subtitle?: string;
  onNewGame?: () => void;
}
// export function VictoryPanel(props: VictoryPanelProps)

export interface SudokuGameProps {
  puzzle?: Grid;
  solution?: Grid;
  difficulty?: string;
  initialValues?: Grid;
  initialNotes?: (Digit[] | undefined)[];
  initialSelected?: CellIndex;
  initialNotesMode?: boolean;
  initialTime?: number;
  /** Dicas disponíveis. Padrão 3. */
  hints?: number;
  timer?: boolean;
  className?: string;
  style?: React.CSSProperties;
}
// export function SudokuGame(props: SudokuGameProps)

```

### 5.1 Button
`secondary` é o padrão; `primary` no máximo uma vez por tela. Rótulo verbo no infinitivo ("Novo jogo").

| Estado | Visual | Tokens |
| --- | --- | --- |
| default | primary: fill marca · secondary: borda neutra · ghost: transparente | `--color-brand`, `--color-text-on-brand`, `--color-border-default`, `--color-surface` |
| hover | escurece 1 passo | `--color-brand-hover`, `--color-surface-sunken` |
| active | escurece 2 passos + `scale(.98)` | `--color-brand-active`, `--duration-fast` |
| focus-visible | `outline` 2px, offset 2px | `--color-focus-ring`, `--focus-ring-width`, `--focus-ring-offset` |
| disabled | fundo afundado, texto desativado, `cursor: not-allowed` | `--color-surface-sunken`, `--color-text-disabled` |

Nunca branco literal sobre marca: use `--color-text-on-brand` (no Dark ele é escuro). Altura `--size-control-md` (40px) ou `--size-control-lg` (48px, mobile).

### 5.2 IconButton
Ícone 24px + legenda 12px (11px dentro da toolbar). Ícones: `undo`, `redo`, `erase`, `notes`, `hint`, `check`, `pause`, `restart`, `sun`, `moon` — traço 1.75, grade 24, `stroke-linecap/linejoin: round`, `currentColor`.

- **Toggle (Notas):** `aria-pressed="true"` → fundo `--color-brand-soft`, ícone e legenda `--color-brand`, selo "on".
- **Dica:** selo com dicas restantes; em 0 → `disabled`.
- **Desativado:** `--color-text-disabled`, sem hover/active.
- `label` é obrigatório (vira `aria-label` + `title` + legenda).

### 5.3 SudokuCell — o componente mais crítico

Precedência de fundo: **selected > error > hint > same-value > related > padrão**.

| Estado | Fundo | Dígito | Sinal não-cromático / ARIA |
| --- | --- | --- | --- |
| Normal (vazia) | `--color-cell-bg` | — | `aria-label="Linha r, coluna c, vazia"` |
| Fixa (pista) | herdado | `--color-cell-text-given`, 600 | `aria-readonly="true"`, `cursor: default` |
| Inserida pelo usuário | herdado | `--color-cell-text-user`, 500 | peso diferente da fixa; entra com `sz-pop` |
| Selecionada | `--color-cell-bg-selected` | mantém | `aria-selected="true"`; no `hc`, anel interno 2px `--color-border-strong` |
| Focada (teclado) | mantém | mantém | `:focus-visible` → `box-shadow: inset 0 0 0 2px var(--color-focus-ring), inset 0 0 0 4px var(--color-cell-bg-selected)` |
| Contexto (linha/col/bloco) | `--color-cell-bg-related` | mantém | — |
| Mesmo número | `--color-cell-bg-same-value` | mantém | — |
| Erro (conflito) | `--color-cell-bg-error` | `--color-cell-text-error` | triângulo no canto sup. direito (`::after`, só em células do usuário), `aria-invalid="true"`, shake ao inserir |
| Erro em pista fixa | `--color-cell-bg-error` | mantém `--color-cell-text-given` | o erro é sempre do usuário |
| Selecionada + erro | `--color-cell-bg-error` | erro | anel interno 2px `--color-error` |
| Notas (pencil marks) | herdado | grade 3×3 absoluta (`inset: 6%`), `--color-cell-text-note`, 600, `max(8px, 2cqi)` | cada dígito em posição fixa (1 sup. esq. … 9 inf. dir.); `aria-label` lista as notas |
| Nota = nº selecionado | — | `--color-cell-text-note-match`, 800 | — |
| Dica | `--color-cell-bg-hint` (1,2s) | `--color-hint` | — |
| Unidade completa | flash `--color-cell-bg-complete` 600ms | — | — |

`aria-label` em PT: `"Linha 3, coluna 5, fixo 7, conflito"`, `"Linha 1, coluna 2, notas 1 4 7"`.

### 5.4 SudokuBoard
- `role="grid"` → wrappers `role="row"` com `display: contents` → `role="gridcell"`. `aria-rowcount=9`, `aria-colcount=9`, `aria-label="Tabuleiro de Sudoku"`.
- **Roving tabindex:** só a célula selecionada (ou a 0 se nenhuma) tem `tabIndex=0`; as demais `-1`. Ao mudar a seleção por teclado, mova o foco para a nova célula.
- Clique: `onMouseDown` → `preventDefault()` + `focus({ preventScroll: true })` + `onSelect(i)` (evita anel de foco com mouse e mantém o teclado funcionando).
- `container-type: inline-size` no tabuleiro — dígitos/notas medem em `cqi`.
- Destaques: ao selecionar `i`, linha + coluna + bloco de `i` → `related`; células com `values[k] === values[i]` (se `values[i] ≠ 0`) → `same-value`; notas iguais → `note-match`. Célula vazia selecionada não destaca números.
- `won` → onda diagonal (`sz-wave`, `animation-delay: calc((linha + coluna) * 40ms)` via custom property `--d`).

### 5.5 NumberPad
- 9 teclas; cada uma: dígito (`key-digit`, `--color-key-text`) + contador de restantes (`key-count`, `--color-key-count`), onde `restantes = 9 − ocorrências`.
- **Completo (0 restantes):** `--color-key-bg-complete`, dígito `--color-key-text-complete`, ✓ no lugar do contador, `aria-disabled="true"`, sem hover.
- **Atual** (dígito da célula selecionada): borda + `inset 0 0 0 1px` em `--color-brand`.
- **Modo notas:** dígitos 18px em `--color-text-secondary` + ponto 6px `--color-brand` no canto sup. esq.; `aria-label` "Nota 5, restam 3".
- Layout `row` (9 colunas, mobile) ou `grid` (3×3, painel desktop). Altura `--size-key` (56px); grid 64px; container < 400px → 52px e dígito 22px.
- hover `--color-key-bg-hover`; active `--color-key-bg-active` + `scale(.95)`.

### 5.6 VictoryPanel
- Aparece ~900ms depois da onda de vitória. Scrim `--color-overlay` com fade (`--duration-base`); card com `sz-enter` (translateY 8px + scale .96 → 1, `--duration-slow`, `--ease-emphasized`, delay 120ms).
- Card `--color-surface-raised`, `--radius-xl`, `--shadow-modal`, padding `--space-8`, máx. 360px; no `hc` borda 2px `--color-border-strong`.
- Selo ✓ 56px `--color-success` sobre `--color-success-soft`. Título `display` "Resolvido"; subtítulo "Sudoku médio concluído."; stats (Tempo mm:ss, Erros, Dicas) em mono; único botão `primary lg block` "Novo jogo" com autofocus.
- `role="dialog"`, `aria-modal="true"`, `aria-labelledby`; trap de foco e `Esc` não fecha (fim de jogo).

### 5.7 SudokuGame (composição + estado)
Estado recomendado (`useReducer`):

```ts
interface GameState {
  givens: number[];        // 81, pistas
  solution: number[];      // 81
  values: number[];        // 81, estado atual (0 = vazio)
  notes: number[][];       // 81 × dígitos
  selected: number;        // -1 = nenhum
  notesMode: boolean;
  past: Snapshot[];        // histórico (máx. 200)
  future: Snapshot[];
  mistakes: number;
  hintsLeft: number;       // padrão 3
  seconds: number;
  won: boolean;
}
type Snapshot = { values: number[]; notes: number[][] };
```

Regras:
- **Inserir** (não fixa, sem vitória): no modo notas, alterna o dígito nas notas (só se a célula estiver vazia). Fora dele: grava o valor, limpa as notas da célula e **remove esse dígito das notas dos 20 vizinhos**. Empilha snapshot em `past`, zera `future`.
- **Conflito** após inserir → `mistakes + 1` e shake na célula (remover classe após 400ms).
- **Unidade completa** (linha/coluna/bloco toda preenchida sem conflitos) → flash nos 9 índices (650ms).
- **Vitória:** `values` igual a `solution` → `won = true`, onda, `VictoryPanel` após 900ms, cronômetro para.
- **Dica:** revela `solution` na célula selecionada (se estiver vazia/errada), senão na primeira célula errada; destaque `hint` por 1,2s; `hintsLeft − 1`.
- **Desfazer/Refazer:** pilhas `past`/`future` de snapshots.
- Cronômetro com `setInterval` de 1s; pausar quando `document.hidden`.

---

## 6. Lógica do tabuleiro (`logic.ts`)

```ts
export const PEERS: number[][] = Array.from({ length: 81 }, (_, i) => {
  const r = Math.floor(i / 9), c = i % 9, br = r - (r % 3), bc = c - (c % 3);
  const s = new Set<number>();
  for (let k = 0; k < 9; k++) {
    s.add(r * 9 + k);
    s.add(k * 9 + c);
    s.add((br + Math.floor(k / 3)) * 9 + bc + (k % 3));
  }
  s.delete(i);
  return [...s];
});

/** Índices em conflito de regra (mesmo dígito em linha, coluna ou bloco). */
export function conflictsOf(values: number[]): Set<number> {
  const bad = new Set<number>();
  values.forEach((v, i) => {
    if (v && PEERS[i].some((p) => values[p] === v)) bad.add(i);
  });
  return bad;
}

/** counts[d] = ocorrências do dígito d (índice 0 ignorado). */
export function countsOf(values: number[]): number[] {
  const c = Array(10).fill(0);
  values.forEach((v) => v && c[v]++);
  return c;
}

/** [linha, coluna, bloco] da célula i. */
export function unitsOf(i: number): [number[], number[], number[]] {
  const r = Math.floor(i / 9), c = i % 9, b = Math.floor(r / 3) * 3 + Math.floor(c / 3);
  const row: number[] = [], col: number[] = [], box: number[] = [];
  for (let k = 0; k < 9; k++) {
    row.push(r * 9 + k);
    col.push(k * 9 + c);
    box.push((Math.floor(b / 3) * 3 + Math.floor(k / 3)) * 9 + (b % 3) * 3 + (k % 3));
  }
  return [row, col, box];
}

export function isRelated(i: number, sel: number): boolean {
  if (sel < 0 || i === sel) return false;
  const r = Math.floor(i / 9), c = i % 9, sr = Math.floor(sel / 9), sc = sel % 9;
  return r === sr || c === sc || (Math.floor(r / 3) === Math.floor(sr / 3) && Math.floor(c / 3) === Math.floor(sc / 3));
}

export const fmtTime = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

/** Puzzle de demonstração (solução válida verificada). */
export const DEMO = {
  solution: '236758419419326578578149236827591643643287951951463827762815394185934762394672185',
  puzzle:   '236700400000006078008040030800500043000007950050400820060010390085004060304600105',
};
```

---

## 7. Interação e movimento

### Mapa de teclado (no tabuleiro)

| Tecla | Ação |
| --- | --- |
| ← ↑ → ↓ | mover seleção (sem wrap) |
| Home / End | início / fim da linha (com Ctrl: primeira / última célula) |
| 1–9 | inserir (ou alternar nota no modo notas) |
| Backspace / Delete / 0 | apagar |
| N | alternar modo notas |
| H | dica |
| Ctrl/⌘+Z | desfazer |
| Ctrl/⌘+Shift+Z ou Ctrl+Y | refazer |

Fora do tabuleiro (ex.: após clicar no teclado numérico), o root do jogo também escuta 1–9, Backspace e Ctrl+Z — ignore o evento se `e.defaultPrevented` (o tabuleiro já tratou).

### Destaques contextuais
- No máximo 3 fundos de destaque + erro visíveis ao mesmo tempo.
- Troca de fundo em `--duration-instant` (80ms) — rápido para não parecer atraso ao navegar com setas.
- Contraste entre camadas ~1.2–1.5:1: legível, mas sem competir com os dígitos.

### Animações (tokens `--duration-*`, `--ease-*`)

| Nome | Quando | Keyframes | Duração / easing |
| --- | --- | --- | --- |
| `sz-pop` | dígito inserido | scale .6 → 1, opacity 0 → 1 | `--duration-fast` · `--ease-emphasized` |
| `sz-shake` | inserção gera conflito (só na célula inserida, 1×) | translateX 0 → −3 → 3 → −2 → 2 → 0 px | `--duration-slow` · `--ease-standard` |
| `sz-flash` | linha/coluna/bloco completo | fundo `--color-cell-bg-complete` → normal | 600ms |
| `sz-wave` | vitória | 40%: scale .9 + `--color-success-soft` / `--color-success` | `--duration-celebrate`, delay `(r+c)×40ms` |
| `sz-fade` | scrim do modal | opacity 0 → 1 | `--duration-base` |
| `sz-enter` | card do modal | translateY 8px scale .96 → none | `--duration-slow` · `--ease-emphasized` |
| tema | troca de `data-theme` | transition em `background-color, color, border-color` via `.sz-theme-anim` (remover após 250ms) | `--duration-base` · `--ease-standard` |

`prefers-reduced-motion: reduce` → todas as animações/transições com 1ms (o estado final é o mesmo).

---

## 8. Acessibilidade

**Contraste (calculado nos 3 temas, WCAG 2.x):**
- `--color-text-primary`, `--color-text-secondary` e `--color-brand` sobre `--color-bg-app` e **todos** os `--color-cell-bg-*` (inclusive selecionada): ≥ 4.5:1 em Light/Dark; ≥ 7:1 no `hc`.
- `--color-error` / `--color-cell-bg-error`, `--color-hint` / `--color-cell-bg-hint`, `--color-success` / `--color-success-soft`, `--color-text-on-brand` / `--color-brand` (+ hover, active): ≥ 4.5:1 (≥ 7:1 no `hc`).
- `--color-border-strong` e `--color-focus-ring` sobre todos os fundos de célula; `--color-border-default` sobre `--color-surface`: ≥ 3:1.
- `--color-text-disabled` é isento (controle inativo) e sempre acompanha outro sinal.
- Sucesso é azul-petróleo e erro é vermelho: diferem em matiz **e** luminosidade (seguro para daltonismo).
- No `hc`, seleção (amarelo) e mesmo número (menta) têm luminância próxima → a selecionada ganha anel interno 2px.

**Checklist ao implementar/alterar:**
- [ ] Nova cor tem valor em `light`, `dark` e `hc` e passa os mínimos acima.
- [ ] Foco visível só com teclado (`:focus-visible`): células com anel **interno** (não vaza nas vizinhas), botões com `outline` + offset.
- [ ] Tabuleiro com padrão ARIA grid e roving tabindex; `aria-label` completo em PT em cada célula.
- [ ] Toggles com `aria-pressed`; teclas completas com `aria-disabled`; cronômetro `role="timer"`.
- [ ] Alvos de toque ≥ 44px.
- [ ] Nenhum estado depende só de cor.
- [ ] `prefers-reduced-motion` respeitado.

---

## 9. Responsividade

Tudo por **container query** em `.sz-game { container-type: inline-size }` — funciona igual em página, modal ou iframe.

| Container | Layout |
| --- | --- |
| < 400px (`--breakpoint-sm`) | mobile compacto: teclas 52px, dígito da tecla 22px |
| < 760px (`--breakpoint-md`) | **mobile**: coluna única, gutter `--space-4`, largura máx. 600px. Ordem: HUD (dificuldade · erros · tempo) → tabuleiro fluido 100% → toolbar de ícones → teclado de 9 em linha. Controles ao alcance do polegar; opcional `position: sticky; bottom: 0; z-index: var(--z-sticky); padding-bottom: env(safe-area-inset-bottom)` |
| ≥ 760px | **desktop**: `grid-template-columns: minmax(0, var(--size-board-max)) var(--size-panel)`, gap `--space-8`, padding `--space-12` `--space-8`, centralizado. Painel lateral (card `--color-surface`, `--radius-lg`, padding `--space-5`): título + tempo → HUD → toolbar → teclado 3×3 (teclas 64px) → "Novo jogo" (secondary, block) |

O tabuleiro nunca rola: largura `min(100%, var(--size-board-max))`, altura pela proporção 1:1.

### Tailwind (opcional)

```js
// tailwind.config.js
module.exports = {
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        app: 'var(--color-bg-app)',
        surface: { DEFAULT: 'var(--color-surface)', raised: 'var(--color-surface-raised)', sunken: 'var(--color-surface-sunken)' },
        brand: { DEFAULT: 'var(--color-brand)', hover: 'var(--color-brand-hover)', active: 'var(--color-brand-active)', soft: 'var(--color-brand-soft)' },
        ink: { DEFAULT: 'var(--color-text-primary)', muted: 'var(--color-text-secondary)', disabled: 'var(--color-text-disabled)', 'on-brand': 'var(--color-text-on-brand)' },
        cell: {
          DEFAULT: 'var(--color-cell-bg)', related: 'var(--color-cell-bg-related)', same: 'var(--color-cell-bg-same-value)',
          selected: 'var(--color-cell-bg-selected)', error: 'var(--color-cell-bg-error)', hint: 'var(--color-cell-bg-hint)',
          complete: 'var(--color-cell-bg-complete)', line: 'var(--color-cell-border)', box: 'var(--color-box-border)',
        },
        error: { DEFAULT: 'var(--color-error)', soft: 'var(--color-error-soft)' },
        success: { DEFAULT: 'var(--color-success)', soft: 'var(--color-success-soft)' },
        hint: { DEFAULT: 'var(--color-hint)', soft: 'var(--color-hint-soft)' },
        focus: 'var(--color-focus-ring)',
      },
      fontFamily: { sans: 'var(--font-sans)', digits: 'var(--font-digits)', mono: 'var(--font-mono)' },
      spacing: { 0.5: 'var(--space-0-5)', 1: 'var(--space-1)', 2: 'var(--space-2)', 3: 'var(--space-3)', 4: 'var(--space-4)', 5: 'var(--space-5)', 6: 'var(--space-6)', 8: 'var(--space-8)', 12: 'var(--space-12)', 16: 'var(--space-16)' },
      borderRadius: { sm: 'var(--radius-sm)', md: 'var(--radius-md)', lg: 'var(--radius-lg)', xl: 'var(--radius-xl)', full: 'var(--radius-full)' },
      boxShadow: { board: 'var(--shadow-board)', modal: 'var(--shadow-modal)', key: 'var(--shadow-key)' },
      transitionDuration: { instant: '80ms', fast: '140ms', base: '220ms', slow: '360ms' },
      maxWidth: { board: 'var(--size-board-max)' },
      width: { panel: 'var(--size-panel)' },
    },
  },
};
```

Requer o plugin `@tailwindcss/container-queries` (v3) ou suporte nativo (v4) para `@container`. Exemplo: `className="bg-cell aria-selected:bg-cell-selected text-brand font-digits tabular-nums"`.

---

## 10. CSS de referência dos componentes (`components.css`)

Implementação validada nos três temas. Pode ser usada como está, ou convertida para CSS Modules / Tailwind mantendo os mesmos tokens e estados.

```css
/* Fontes: carregadas no index.html (ver §0) */

/* ============ Base ============ */
body { margin: 0; font-family: var(--font-sans); background: var(--color-bg-app); color: var(--color-text-primary); -webkit-font-smoothing: antialiased; }
.sz-root, .sz-root * { box-sizing: border-box; }
.sz-row { display: flex; flex-wrap: wrap; gap: var(--space-3); align-items: center; padding: var(--space-4); }
.sz-stack { display: flex; flex-direction: column; gap: var(--space-4); padding: var(--space-4); }
.sz-caption { font-size: 12px; line-height: 16px; font-weight: 500; letter-spacing: .02em; color: var(--color-text-secondary); }
.sz-theme-anim, .sz-theme-anim * {
  transition: background-color var(--duration-base) var(--ease-standard), color var(--duration-base) var(--ease-standard), border-color var(--duration-base) var(--ease-standard);
}

/* ============ Button ============ */
.sz-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: var(--space-2);
  height: var(--size-control-md); padding: 0 var(--space-4); border-radius: var(--radius-md);
  border: 1px solid transparent; font: inherit; font-size: 14px; line-height: 20px; font-weight: 600;
  cursor: pointer; white-space: nowrap; user-select: none;
  transition: background-color var(--duration-fast) var(--ease-standard), border-color var(--duration-fast) var(--ease-standard), color var(--duration-fast) var(--ease-standard), transform var(--duration-fast) var(--ease-standard);
}
.sz-btn svg { width: 18px; height: 18px; flex: none; }
.sz-btn--lg { height: var(--size-control-lg); padding: 0 var(--space-5); font-size: 15px; }
.sz-btn--block { width: 100%; }
.sz-btn--primary { background: var(--color-brand); color: var(--color-text-on-brand); }
.sz-btn--primary:hover { background: var(--color-brand-hover); }
.sz-btn--primary:active { background: var(--color-brand-active); transform: scale(.98); }
.sz-btn--secondary { background: var(--color-surface); color: var(--color-text-primary); border-color: var(--color-border-default); }
.sz-btn--secondary:hover { background: var(--color-surface-sunken); }
.sz-btn--secondary:active { transform: scale(.98); }
.sz-btn--ghost { background: transparent; color: var(--color-text-primary); }
.sz-btn--ghost:hover { background: var(--color-surface-sunken); }
.sz-btn--ghost:active { transform: scale(.98); }
.sz-btn:focus-visible, .sz-iconbtn:focus-visible, .sz-key:focus-visible {
  outline: var(--focus-ring-width) solid var(--color-focus-ring); outline-offset: var(--focus-ring-offset);
}
.sz-btn:disabled, .sz-btn[aria-disabled="true"] {
  background: var(--color-surface-sunken); color: var(--color-text-disabled); border-color: transparent; cursor: not-allowed; transform: none;
}

/* ============ IconButton ============ */
.sz-iconbtn {
  position: relative; display: inline-flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--space-1);
  min-width: var(--size-touch-min); min-height: var(--size-touch-min); padding: var(--space-2) var(--space-3);
  border: 0; border-radius: var(--radius-md); background: transparent; color: var(--color-text-primary);
  font: inherit; cursor: pointer; user-select: none;
  transition: background-color var(--duration-fast) var(--ease-standard), color var(--duration-fast) var(--ease-standard), transform var(--duration-fast) var(--ease-standard);
}
.sz-iconbtn svg { width: 24px; height: 24px; }
.sz-iconbtn__label { font-size: 12px; line-height: 16px; font-weight: 600; color: var(--color-text-secondary); }
.sz-iconbtn:hover { background: var(--color-surface-sunken); }
.sz-iconbtn:active { transform: scale(.94); }
.sz-iconbtn[aria-pressed="true"] { background: var(--color-brand-soft); color: var(--color-brand); }
.sz-iconbtn[aria-pressed="true"] .sz-iconbtn__label { color: var(--color-brand); }
.sz-iconbtn:disabled { color: var(--color-text-disabled); cursor: not-allowed; background: transparent; transform: none; }
.sz-iconbtn:disabled .sz-iconbtn__label { color: var(--color-text-disabled); }
.sz-iconbtn__badge {
  position: absolute; top: 2px; right: 2px; min-width: 18px; height: 18px; padding: 0 5px; border-radius: var(--radius-full);
  background: var(--color-brand); color: var(--color-text-on-brand); font-size: 11px; line-height: 18px; font-weight: 700; font-variant-numeric: tabular-nums;
}
.sz-iconbtn:disabled .sz-iconbtn__badge { background: var(--color-surface-sunken); color: var(--color-text-disabled); }
.sz-toolbar { display: flex; justify-content: space-between; gap: var(--space-1); }
.sz-toolbar .sz-iconbtn { flex: 1 1 0; min-width: 0; padding-left: 0; padding-right: 0; }
.sz-toolbar .sz-iconbtn__label { font-size: 11px; }

/* ============ Board ============ */
.sz-board {
  container-type: inline-size; position: relative; width: 100%; max-width: var(--size-board-max); aspect-ratio: 1 / 1;
  display: grid; grid-template-columns: repeat(9, 1fr); grid-template-rows: repeat(9, 1fr);
  border: var(--border-board) solid var(--color-box-border); border-radius: var(--radius-md); overflow: hidden;
  background: var(--color-cell-bg); box-shadow: var(--shadow-board); z-index: var(--z-board);
}
.sz-board__row { display: contents; }

/* ============ Cell ============ */
.sz-cell {
  position: relative; display: flex; align-items: center; justify-content: center; min-width: 0; min-height: 0;
  background: var(--color-cell-bg); color: var(--color-cell-text-user);
  border-right: var(--border-cell) solid var(--color-cell-border); border-bottom: var(--border-cell) solid var(--color-cell-border);
  font-family: var(--font-digits); font-variant-numeric: tabular-nums lining-nums; font-feature-settings: "tnum" 1, "lnum" 1;
  font-size: 5.6cqi; line-height: 1; font-weight: 500; cursor: pointer; user-select: none; outline: none;
  -webkit-tap-highlight-color: transparent;
  transition: background-color var(--duration-instant) var(--ease-standard), color var(--duration-base) var(--ease-standard);
}
.sz-cell[data-c="8"] { border-right: 0; }
.sz-cell[data-r="8"] { border-bottom: 0; }
.sz-cell[data-c="2"], .sz-cell[data-c="5"] { border-right: var(--border-box) solid var(--color-box-border); }
.sz-cell[data-r="2"], .sz-cell[data-r="5"] { border-bottom: var(--border-box) solid var(--color-box-border); }
.sz-cell.is-given { color: var(--color-cell-text-given); font-weight: 600; cursor: default; }
.sz-cell.is-related { background: var(--color-cell-bg-related); }
.sz-cell.is-same { background: var(--color-cell-bg-same-value); }
.sz-cell.is-hint { background: var(--color-cell-bg-hint); color: var(--color-hint); }
.sz-cell.is-selected { background: var(--color-cell-bg-selected); }
.sz-cell.is-error { background: var(--color-cell-bg-error); color: var(--color-cell-text-error); }
.sz-cell.is-given.is-error { color: var(--color-cell-text-given); }
.sz-cell.is-error:not(.is-given)::after {
  content: ""; position: absolute; top: 0; right: 0; width: 0; height: 0;
  border-top: max(6px, 1.7cqi) solid var(--color-error); border-left: max(6px, 1.7cqi) solid transparent;
}
.sz-cell.is-selected.is-error { box-shadow: inset 0 0 0 2px var(--color-error); }
[data-theme="hc"] .sz-cell.is-selected { box-shadow: inset 0 0 0 2px var(--color-border-strong); }
.sz-cell:focus-visible { box-shadow: inset 0 0 0 var(--focus-ring-width) var(--color-focus-ring), inset 0 0 0 4px var(--color-cell-bg-selected); z-index: 2; }
.sz-cell__digit { display: block; }
.sz-cell__digit.is-pop { animation: sz-pop var(--duration-fast) var(--ease-emphasized); }
.sz-cell.is-shake .sz-cell__digit { animation: sz-shake var(--duration-slow) var(--ease-standard); }
.sz-cell.is-flash { animation: sz-flash 600ms var(--ease-standard); }

.sz-notes {
  position: absolute; inset: 6%; display: grid; grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(3, 1fr);
  font-size: max(8px, 2cqi); font-weight: 600; line-height: 1; color: var(--color-cell-text-note);
}
.sz-notes span { display: flex; align-items: center; justify-content: center; }
.sz-notes span.is-match { color: var(--color-cell-text-note-match); font-weight: 800; }

/* Vitória: onda diagonal */
.sz-board.is-won .sz-cell { animation: sz-wave var(--duration-celebrate) var(--ease-emphasized) both; animation-delay: calc(var(--d, 0) * 40ms); }

/* ============ NumberPad ============ */
.sz-pad { display: grid; grid-template-columns: repeat(9, 1fr); gap: var(--space-1); }
.sz-pad--grid { grid-template-columns: repeat(3, 1fr); gap: var(--space-2); }
.sz-key {
  position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
  min-width: 0; height: var(--size-key); padding: 0; border: 1px solid var(--color-border-subtle); border-radius: var(--radius-md);
  background: var(--color-key-bg); color: var(--color-key-text); box-shadow: var(--shadow-key);
  font: inherit; cursor: pointer; user-select: none; -webkit-tap-highlight-color: transparent;
  transition: background-color var(--duration-fast) var(--ease-standard), transform var(--duration-fast) var(--ease-standard), color var(--duration-fast) var(--ease-standard);
}
.sz-pad--grid .sz-key { height: 64px; }
.sz-key__digit { font-family: var(--font-digits); font-variant-numeric: tabular-nums; font-size: 26px; line-height: 1; font-weight: 600; }
.sz-key__count { font-size: 11px; line-height: 14px; font-weight: 600; color: var(--color-key-count); font-variant-numeric: tabular-nums; display: inline-flex; align-items: center; height: 14px; }
.sz-key__count svg { width: 13px; height: 13px; }
.sz-key:hover { background: var(--color-key-bg-hover); }
.sz-key:active { background: var(--color-key-bg-active); transform: scale(.95); }
.sz-key.is-current { border-color: var(--color-brand); box-shadow: inset 0 0 0 1px var(--color-brand); }
.sz-key.is-complete { background: var(--color-key-bg-complete); color: var(--color-key-text-complete); box-shadow: none; border-color: transparent; cursor: default; transform: none; }
.sz-key.is-complete .sz-key__count { color: var(--color-key-text-complete); }
.sz-pad.is-notes .sz-key__digit { font-size: 18px; font-weight: 700; color: var(--color-text-secondary); }
.sz-pad.is-notes .sz-key:not(.is-complete)::before {
  content: ""; position: absolute; top: 6px; left: 6px; width: 6px; height: 6px; border-radius: var(--radius-full); background: var(--color-brand);
}
@container (max-width: 399px) {
  .sz-pad:not(.sz-pad--grid) .sz-key { height: 52px; }
  .sz-pad:not(.sz-pad--grid) .sz-key__digit { font-size: 22px; }
}

/* ============ Victory ============ */
.sz-scrim { position: absolute; inset: 0; z-index: var(--z-overlay); display: flex; align-items: center; justify-content: center; padding: var(--space-4); background: var(--color-overlay); animation: sz-fade var(--duration-base) var(--ease-standard) both; }
.sz-dialog {
  width: 100%; max-width: 360px; padding: var(--space-8); border-radius: var(--radius-xl);
  background: var(--color-surface-raised); color: var(--color-text-primary); box-shadow: var(--shadow-modal); text-align: center;
  animation: sz-enter var(--duration-slow) var(--ease-emphasized) both; animation-delay: 120ms;
}
[data-theme="hc"] .sz-dialog { border: 2px solid var(--color-border-strong); }
.sz-dialog__seal { width: 56px; height: 56px; margin: 0 auto var(--space-4); border-radius: var(--radius-full); background: var(--color-success-soft); color: var(--color-success); display: flex; align-items: center; justify-content: center; }
.sz-dialog__seal svg { width: 28px; height: 28px; }
.sz-dialog__title { margin: 0; font-size: 32px; line-height: 40px; font-weight: 700; letter-spacing: -.02em; }
.sz-dialog__sub { margin: var(--space-1) 0 var(--space-6); font-size: 15px; line-height: 22px; color: var(--color-text-secondary); }
.sz-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-2); margin: 0 0 var(--space-6); padding: 0; }
.sz-stats div { padding: var(--space-3) var(--space-1); border-radius: var(--radius-lg); background: var(--color-surface-sunken); }
.sz-stats dt { font-size: 12px; line-height: 16px; font-weight: 500; color: var(--color-text-secondary); }
.sz-stats dd { margin: 2px 0 0; font-family: var(--font-mono); font-size: 16px; line-height: 24px; font-weight: 500; font-variant-numeric: tabular-nums; }

/* ============ Game layout ============ */
.sz-game { container-type: inline-size; position: relative; width: 100%; background: var(--color-bg-app); color: var(--color-text-primary); }
.sz-game__layout { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--space-4); padding: var(--space-4); max-width: 600px; margin: 0 auto; }
.sz-game__board { display: flex; justify-content: center; }
.sz-game__panel { display: flex; flex-direction: column; gap: var(--space-4); }
.sz-hud { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); }
.sz-hud__meta { display: flex; gap: var(--space-4); align-items: baseline; }
.sz-hud__item { font-size: 12px; line-height: 16px; font-weight: 500; letter-spacing: .02em; color: var(--color-text-secondary); }
.sz-hud__item strong { font-weight: 700; color: var(--color-text-primary); }
.sz-timer { font-family: var(--font-mono); font-size: 16px; line-height: 24px; font-weight: 500; font-variant-numeric: tabular-nums; color: var(--color-text-secondary); }
.sz-game__cta { display: none; }
.sz-card { background: var(--color-surface); border: 1px solid var(--color-border-subtle); border-radius: var(--radius-lg); padding: var(--space-5); display: flex; flex-direction: column; gap: var(--space-5); }
.sz-game__panel .sz-card { display: contents; }
.sz-title { margin: 0; font-size: 20px; line-height: 28px; font-weight: 700; letter-spacing: -.01em; }
.sz-game__head { display: none; }

.sz-desktop-only { display: none; }

@container (min-width: 760px) {
  .sz-game__layout {
    max-width: none; grid-template-columns: minmax(0, var(--size-board-max)) var(--size-panel);
    justify-content: center; align-items: start; gap: var(--space-8); padding: var(--space-12) var(--space-8);
  }
  .sz-game__panel .sz-card { display: flex; }
  .sz-game__head { display: flex; justify-content: space-between; align-items: baseline; }
  .sz-game__cta { display: flex; }
  .sz-game .sz-pad { grid-template-columns: repeat(3, 1fr); gap: var(--space-2); }
  .sz-game .sz-pad .sz-key { height: 64px; }
  .sz-mobile-only { display: none; }
  .sz-desktop-only { display: block; }
  .sz-game__mobilehud { display: none; }
}

/* ============ Keyframes ============ */
@keyframes sz-pop { 0% { transform: scale(.6); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
@keyframes sz-shake { 0%, 100% { transform: translateX(0); } 20% { transform: translateX(-3px); } 40% { transform: translateX(3px); } 60% { transform: translateX(-2px); } 80% { transform: translateX(2px); } }
@keyframes sz-flash { 0% { background-color: var(--color-cell-bg-complete); } 100% { } }
@keyframes sz-wave { 0% { transform: scale(1); } 40% { transform: scale(.9); background-color: var(--color-success-soft); color: var(--color-success); } 100% { transform: scale(1); } }
@keyframes sz-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes sz-enter { from { opacity: 0; transform: translateY(8px) scale(.96); } to { opacity: 1; transform: none; } }

@media (prefers-reduced-motion: reduce) {
  .sz-root *, .sz-root { animation-duration: 1ms !important; animation-delay: 0ms !important; transition-duration: 1ms !important; }
}
```

---

## 11. Ícones (SVG, viewBox 0 0 24 24, stroke 1.75, round caps/joins, `fill="none"`, `stroke="currentColor"`)

```ts
export const ICONS: Record<string, string[]> = {
  undo: ["M9 14 4 9l5-5", "M4 9h10.5a5.5 5.5 0 0 1 0 11H11"],
  redo: ["m15 14 5-5-5-5", "M20 9H9.5a5.5 5.5 0 0 0 0 11H13"],
  erase: ["m7 21-4.3-4.3a1 1 0 0 1 0-1.4l9.6-9.6a1 1 0 0 1 1.4 0l5.6 5.6a1 1 0 0 1 0 1.4L13 21", "M22 21H7", "m5 11 9 9"],
  hint: ["M9 18h6", "M10 22h4", "M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.3h6c0-1 .4-1.8 1-2.3A7 7 0 0 0 12 2z"],
  notes: ["M12 20h9", "M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"],
  check: ["M20 6 9 17l-5-5"],
  pause: ["M9 5v14", "M15 5v14"],
  restart: ["M3 12a9 9 0 1 0 3-6.7L3 8", "M3 3v5h5"],
  sun: ["M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z", "M12 2v2", "M12 20v2", "m4.9 4.9 1.4 1.4", "m17.7 17.7 1.4 1.4", "M2 12h2", "M20 12h2", "m4.9 19.1 1.4-1.4", "m17.7 6.3 1.4-1.4"],
  moon: ["M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"]
  
};
```
