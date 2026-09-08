# Code for Speed

> **Code for Speed** é um jogo de corrida arcade 3D de rua desenvolvido para navegador (_browser-first_), ambientado em uma versão inspirada no bairro Papicu em **Fortaleza, Ceará (Brasil)**.

---

## Visão Geral

O projeto foca em entregar uma **experiência de pilotagem ágil, fluida e divertida** diretamente no navegador, sem necessidade de instalações ou plugins externos. A física é voltada para a jogabilidade estilo _arcade_ (com drift, boost de nitro e freio de mão responsivo), combinada com a geração procedural de terrenos e edifícios a partir de dados geográficos abertos.

Target de desempenho: **~60 FPS** em hardwares modernos de desktop.

---

## ⚡ Principais Funcionalidades

- **Física de Carro Arcade**:
  - Resposta imediata de aceleração, frenagem e esterçamento adaptativo à velocidade.
  - Mecânica de **Drift** com fases de iniciação, sustentação e recuperação.
  - Sistema de **Nitro Boost** e **Freio de Mão**.
  - Restauração automática ou manual (`R`) em caso de capotamento ou saída de pista.
- **Mundo Urbano Inspirado em Fortaleza**:
  - Malha viária gerada a partir de dados geográficos reais (GeoJSON / OpenStreetMap de Papicu, Fortaleza).
  - Geração procedural de edifícios com fachadas, alturas variadas e colisores físicos de impacto.
  - Detalhamento de pista: asfalto texturizado, marcações viárias, tampas de bueiro e postes de iluminação pública.
- **Sistema de Câmeras & HUD**:
  - Câmera de perseguição (_chase camera_) dinâmica com múltiplos modos de exibição (`C`).
  - Velocímetro analógico/digital, indicador de marcha, barra de nitro e nome da região.
- **Ferramentas de Desenvolvimento e Debug**:
  - Painel de telemetria e desempenho (`F3`).
  - Modo de validação de mapa com câmera superior _top-down_ (`F4`).

---

## Controles

| Ação                              | Tecla                                                   |
| :-------------------------------- | :------------------------------------------------------ |
| **Acelerar**                      | `W` ou `Seta para Cima`                                 |
| **Frear / Ré**                    | `S` ou `Seta para Baixo`                                |
| **Esterçar (Esquerda / Direita)** | `A` / `D` ou `Seta para Esquerda` / `Seta para Direita` |
| **Freio de Mão (Drift)**          | `Espaço`                                                |
| **Nitro (Turbo)**                 | `Shift Esquerdo` ou `Shift Direito`                     |
| **Reiniciar Posição (Reset)**     | `R`                                                     |
| **Alternar Modo de Câmera**       | `C`                                                     |
| **Painel de Debug / Telemetria**  | `F3`                                                    |
| **Modo Visão Geral do Mapa**      | `F4`                                                    |
| **Pausar / Retomar**              | `Esc`                                                   |

---

## Tecnologias Utilizadas

- **Linguagem**: [TypeScript](https://www.typescriptlang.org/)
- **Build Tool / Bundler**: [Vite](https://vitejs.dev/)
- **Engine 3D**: [Three.js](https://threejs.org/)
- **Motor de Física 3D**: [@dimforge/rapier3d-compat](https://rapier.rs/) (Rapier Physics WASM)
- **Interface & HUD**: HTML5 & CSS3 Vanilla
- **Testes Unitários**: [Vitest](https://vitest.dev/)
- **Testes End-to-End**: [Playwright](https://playwright.dev/)
- **Linter & Formatador**: ESLint

---

## Como Executar o Projeto

### Pré-requisitos

- **Node.js** (v18 ou superior)
- **npm** ou gerenciador de pacotes equivalente

### 1. Clonar o repositório e instalar as dependências

```bash
git clone https://github.com/saviolopes018/code-for-speed.git
cd code-for-speed
npm install
```

### 2. Executar o servidor de desenvolvimento

```bash
npm run dev
```

Abra o navegador no endereço indicado (geralmente `http://localhost:5173`).

### 3. Build para produção

Para compilar o projeto para produção:

```bash
npm run build
```

Para visualizar a versão compilada localmente:

```bash
npm run preview
```

---

## 🧪 Testes e Qualidade de Código

O projeto conta com uma suíte de testes automatizados e verificações estáticas:

```bash
# Executar testes unitários (Vitest)
npm run test

# Executar testes em modo watch
npm run test:watch

# Executar testes End-to-End (Playwright)
npm run test:e2e

# Checagem de tipos do TypeScript
npm run typecheck

# Executar linter (ESLint)
npm run lint
```

---

## 🗺️ Importação de Dados Geográficos

O projeto inclui uma ferramenta para importar e converter dados do OpenStreetMap / GeoJSON para a estrutura de mapa utilizada pelo jogo:

```bash
npm run map:import
```

Os dados do mapa ficam armazenados no diretório `public/maps/`.

---

## 📂 Estrutura do Projeto

```text
code-for-speed/
├── public/                # Assets estáticos e arquivos de mapa (GeoJSON/JSON)
├── src/
│   ├── camera/            # Sistema de câmera de perseguição (ChaseCamera)
│   ├── core/              # Game Loop, gerenciador de entradas (Input), motor de física e tempo
│   ├── debug/             # Painel de debug e estatísticas de runtime
│   ├── hud/               # Overlay HTML/CSS do velocímetro e interface do usuário
│   ├── race/              # Lógica de checkpoints e temporizador de corrida
│   ├── rendering/         # Renderer do Three.js, iluminação e ambiente
│   ├── vehicle/           # Física, controles, telemetria, nitro e modelo visual do veículo
│   ├── world/             # Geração de pistas, estradas, edifícios procedurais e malha urbana
│   ├── main.ts            # Ponto de entrada da aplicação
│   └── style.css          # Estilos da interface e HUD
├── tests/                 # Testes unitários com Vitest
├── e2e/                   # Testes E2E com Playwright
├── tools/                 # Scripts auxiliares (ex: importador de mapas GeoJSON)
├── CLAUDE.md              # Diretrizes técnicas e arquitetura do projeto
└── package.json           # Dependências e scripts
```

---

## 📄 Licença

Este projeto é um software privado desenvolvido para fins de demonstração técnica e entretenimento.
