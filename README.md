# 🍕 Monitor de Pedidos

Sistema de monitoramento de pedidos em tempo real.

## 📁 Estrutura

```
monitor-pedidos/
├── src/
│   ├── App.tsx          # Todo o frontend aqui
│   ├── App.css          # Estilos
│   └── main.tsx         # Entry point
├── server/
│   └── index.ts         # Todo o backend aqui
├── .env                 # Suas configs do banco
└── package.json         # Dependências mínimas
```

## 🚀 Setup Rápido

```bash
# 1. Instalar
npm install

# 2. Configurar .env
DB_HOST=localhost
DB_NAME=seu_banco
DB_USER=postgres
DB_PASSWORD=sua_senha

# 3. Rodar
npm run dev
```

Pronto! Abre em `http://localhost:5173`

## 🎯 O que faz

- **3 colunas**: Andamento | Último Pronto | Histórico
- **Tempo real**: WebSocket simples
- **Som**: Toca quando pedido fica pronto
- **Adaptável**: Funciona com qualquer estrutura de banco

## 🔧 Adaptar ao seu banco

No `server/index.ts`, mude apenas as consultas SQL:

```typescript
// Se sua tabela não se chama "pedidos"
SELECT * FROM suas_comandas WHERE...

// Se seus status são diferentes
WHERE status ILIKE '%fazendo%'  // mude aqui
WHERE status ILIKE '%finalizado%'  // e aqui
```

## 💻 Código Ultra Simples

### Frontend (App.tsx)

- 1 componente só
- Estado com `useState`
- Fetch direto, sem libs
- Formatação inline

### Backend (server/index.ts)

- Express + Socket.IO + PostgreSQL
- 3 rotas GET simples
- Polling a cada 3s
- Zero abstrações

## 🎨 Visual Bonito

- Gradientes modernos
- Animações suaves
- Responsivo mobile
- Cards com hover
- Cores por status

## ⚡ Performance

- Lightweight (poucas deps)
- Bundle pequeno
- Queries otimizadas
- Hot reload rápido

---

**🎯 Filosofia: Máximo resultado, mínimo código!**

Ideal para lanchonetes que querem algo **profissional** mas **simples de manter**.
