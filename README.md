# Monitor de Pedidos - Sistema de Monitoramento em Tempo Real

Sistema profissional para monitoramento de pedidos com interface limpa, atualizações em tempo real e gerenciamento de banner promocional.

## Funcionalidades Principais

- **Interface de 2 colunas**: Em Preparo | Pedidos Prontos
- **Atualizações em tempo real** via WebSocket
- **Destaque automático** para último pedido pronto
- **Notificação sonora** quando pedido fica pronto
- **Upload de banner** promocional com painel administrativo
- **Lógica inteligente** de exibição (nome > senha > ID)
- **Design responsivo** para diferentes resoluções

## Estrutura do Projeto

```
monitor-pedidos/
├── src/
│   ├── components/
│   │   ├── Monitor.tsx           # Tela principal de monitoramento
│   │   ├── monitor.css           # Estilos do monitor
│   │   ├── AdminPanel.tsx        # Painel administrativo
│   │   └── admin-panel.css       # Estilos do admin
│   ├── types/
│   │   └── Pedido.ts            # Interfaces TypeScript
│   ├── App.tsx                  # Roteamento principal
│   └── main.tsx                 # Entry point
├── server/
│   └── index.ts                 # Backend completo
├── public/
│   └── notification.mp3         # Som de notificação
├── uploads/                     # Pasta para banners
├── .env                         # Configurações do banco
└── package.json                 # Dependências
```

## Setup e Instalação

### Pre-requisitos
- Node.js 18+
- PostgreSQL
- NPM ou Yarn

### Configuração

```bash
# 1. Instalar dependências
npm install

# 2. Configurar banco de dados
# Crie um arquivo .env com:
DB_HOST=localhost
DB_PORT=5432
DB_NAME=seu_banco
DB_USER=postgres
DB_PASSWORD=sua_senha
PORT=3001

# 3. Executar o sistema
npm run dev
```

### Acessos
- **Monitor Principal**: http://localhost:5173
- **Painel Admin**: http://localhost:5173/admin

## Configuração do Banco de Dados

O sistema funciona com qualquer tabela PostgreSQL que contenha:

### Campos obrigatórios:
- `id` (integer) - Identificador único
- `status` (varchar) - Status do pedido
- `updated_at` (timestamp) - Data de atualização

### Campos opcionais:
- `senha` (varchar) - Número/código do pedido
- `nome_cliente` (varchar) - Nome do cliente
- `created_at` (timestamp) - Data de criação

### Adaptação das consultas:

No arquivo `server/index.ts`, ajuste as consultas conforme sua estrutura:

```typescript
// Para pedidos em andamento
WHERE status ILIKE ANY(['%andamento%', '%preparando%', '%fazendo%'])

// Para pedidos prontos  
WHERE status ILIKE ANY(['%pronto%', '%finalizado%', '%concluido%'])
```

## Gerenciamento de Banner

### Especificações técnicas:
- **Dimensões recomendadas**: 1920x250 pixels
- **Formatos aceitos**: JPG, PNG, GIF, WEBP
- **Tamanho máximo**: 5MB
- **Proporção**: Aproximadamente 25% da altura da tela

### Funcionalidades:
- Upload via drag & drop ou clique
- Visualização prévia
- Remoção de banner
- Atualização automática na tela principal

## Características Técnicas

### Frontend
- **React 18** com TypeScript
- **CSS Grid** para layout responsivo
- **Socket.IO Client** para tempo real
- **React Router** para navegação

### Backend
- **Express.js** com TypeScript
- **Socket.IO** para WebSocket
- **Multer** para upload de arquivos
- **node-postgres** para PostgreSQL
- **Polling inteligente** a cada 2 segundos

### Detecção de Mudanças
O sistema utiliza polling híbrido que monitora:
- Mudanças no `updated_at` dos pedidos
- Alterações de status em tempo real
- Período de inatividade (2 horas) para limpeza automática

## Audio e Notificações

- **Som de notificação** quando novo pedido fica em destaque
- **Suporte a MP3** para melhor compatibilidade
- **Volume ajustável** via código
- **Ativação inteligente** apenas para mudanças relevantes

## Responsividade

### Desktop (1920x1080+):
- Layout de 2 colunas (2fr | 3fr)
- Banner de 250px de altura
- Fonte grande para boa visibilidade

### Tablet (768px-1024px):
- Mantém 2 colunas proporcionais
- Ajuste de fontes e espaçamentos

### Mobile (<768px):
- Layout em coluna única
- Banner reduzido para 100px
- Fontes adaptadas para toque

## Desenvolvimento

### Scripts disponíveis:
```bash
npm run dev      # Desenvolvimento (frontend + backend)
npm run build    # Build de produção
npm run server   # Apenas backend
```

### Estrutura de desenvolvimento:
- **Hot reload** automático
- **TypeScript strict** mode
- **Linting** com ESLint
- **Componentes modulares**

## Deployment

Para produção:

1. **Build da aplicação**:
   ```bash
   npm run build
   ```

2. **Configurar variáveis de ambiente** no servidor

3. **Configurar proxy reverso** (Nginx recomendado)

4. **Configurar PostgreSQL** em produção

5. **Pasta uploads** com permissões adequadas

## Personalização

### Cores e estilos:
- Modifique os arquivos `.css` nos componentes
- Cores principais: Laranja (#ff8c00) e Verde (#28a745)

### Sons de notificação:
- Substitua o arquivo `public/ding-dong.wav`
- Formatos suportados: MP3, WAV, OGG

### Consultas de banco:
- Ajuste as queries em `server/index.ts`
- Modifique os critérios de status conforme necessário

---

**Sistema desenvolvido para estabelecimentos que precisam de monitoramento visual eficiente e profissional de pedidos em tempo real.**