import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Tipos simples
interface Pedido {
  id: number;
  senha: string;
  nome_cliente: string;
  status: string;
  updated_at?: string;
}

// Setup
const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: { 
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"], 
    methods: ["GET", "POST"] 
  }
});

// Middleware
app.use(express.json());

// CORS para API REST
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// PostgreSQL
const db = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME!,
  user: process.env.DB_USER!,
  password: process.env.DB_PASSWORD!
});

// Conectar banco
db.connect()
  .then(() => console.log('✅ PostgreSQL conectado'))
  .catch(err => console.error('❌ Erro PostgreSQL:', err));

// Rotas simples
app.get('/api/pedidos/andamento', async (req, res) => {
  try {
    const result = await db.query<Pedido>(`
      SELECT * FROM public.pedidos 
      WHERE status ILIKE ANY($1)
      ORDER BY updated_at DESC LIMIT 20
    `, [['%andamento%', '%preparando%', '%fazendo%']]);
    
    res.json(result.rows);
  } catch {
    res.json([]);
  }
});

app.get('/api/pedidos/ultimo-pronto', async (req, res) => {
  try {
    const result = await db.query<Pedido>(`
      SELECT * FROM public.pedidos 
      WHERE status ILIKE ANY($1)
      ORDER BY updated_at DESC LIMIT 1
    `, [['%pronto%', '%finalizado%', '%concluido%']]);
    
    res.json(result.rows[0] || null);
  } catch {
    res.json(null);
  }
});

app.get('/api/pedidos/prontos', async (req, res) => {
  try {
    const result = await db.query<Pedido>(`
      SELECT * FROM public.pedidos 
      WHERE status ILIKE ANY($1)
      ORDER BY updated_at DESC LIMIT 10
    `, [['%pronto%', '%finalizado%', '%concluido%']]);
    
    res.json(result.rows);
  } catch {
    res.json([]);
  }
});

// WebSocket
io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);
  socket.on('disconnect', () => console.log('Cliente saiu:', socket.id));
});

// Polling híbrido - STATUS + UPDATED_AT (mais robusto)
let ultimaVerificacao = new Date();

setInterval(async () => {
  try {
    // Busca pedidos que mudaram recentemente (updated_at)
    const result = await db.query<Pedido>(`
      SELECT id, senha, status, updated_at 
      FROM public.pedidos 
      WHERE updated_at > $1
      ORDER BY updated_at DESC
    `, [ultimaVerificacao]);
    
    if (result.rows.length > 0) {
      console.log(`🔄 ${result.rows.length} pedido(s) alterado(s) recentemente:`);
      
      result.rows.forEach(pedido => {
        console.log(`   • Pedido ${pedido.senha}: ${pedido.status} (${new Date(pedido.updated_at!).toLocaleTimeString()})`);
        
        // Destaca se ficou pronto
        if (pedido.status.toLowerCase().includes('pronto') || 
            pedido.status.toLowerCase().includes('finalizado') ||
            pedido.status.toLowerCase().includes('concluido')) {
          console.log(`   🎉 PEDIDO ${pedido.senha} FICOU PRONTO!`);
        }
      });
      
      console.log('📡 Emitindo atualização via WebSocket...');
      io.emit('pedido_update');
    }
    
    ultimaVerificacao = new Date();
    
  } catch (error) {
    console.error('❌ Erro no polling:', error);
  }
}, 2000); // A cada 2 segundos

// Start server
const PORT = Number(process.env.PORT) || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});