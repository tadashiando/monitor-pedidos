import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { Client } from "pg";
import dotenv from "dotenv";
import multer from "multer";
import path from "path";
import fs from "fs";

dotenv.config();

// Tipos simples
interface Pedido {
  id: number;
  senha: string;
  nome_cliente: string;
  status:
    | "andamento"
    | "preparando"
    | "fazendo"
    | "pronto"
    | "finalizado"
    | "concluido"
    | "cancelado";
  created_at: string;
  updated_at: string;
}

// Setup
const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    methods: ["GET", "POST"],
  },
});

// Middleware
app.use(express.json());

// CORS para API REST
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});

// Servir arquivos estáticos (banner)
app.use("/uploads", express.static("uploads"));

// Configurar multer para upload do banner
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "uploads";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Sempre salva como 'banner' + extensão
    const ext = path.extname(file.originalname);
    cb(null, `banner${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error("Apenas imagens são permitidas"));
    }
  },
});

// PostgreSQL
const db = new Client({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME!,
  user: process.env.DB_USER!,
  password: process.env.DB_PASSWORD!,
});

// Conectar banco
db.connect()
  .then(() => console.log("✅ PostgreSQL conectado"))
  .catch((err) => console.error("❌ Erro PostgreSQL:", err));

// Rotas dos pedidos
app.get("/api/pedidos/andamento", async (req, res) => {
  try {
    const result = await db.query<Pedido>(
      `
      SELECT * FROM public.pedidos 
      WHERE status ILIKE ANY($1)
      ORDER BY created_at DESC LIMIT 20
    `,
      [["%andamento%", "%preparando%", "%fazendo%"]]
    );

    res.json(result.rows);
  } catch {
    res.json([]);
  }
});

app.get("/api/pedidos/ultimo-pronto", async (req, res) => {
  try {
    const result = await db.query<Pedido>(
      `
      SELECT * FROM public.pedidos 
      WHERE status ILIKE ANY($1)
      ORDER BY updated_at DESC LIMIT 1
    `,
      [["%pronto%", "%finalizado%", "%concluido%"]]
    );

    res.json(result.rows[0] || null);
  } catch {
    res.json(null);
  }
});

app.get("/api/pedidos/prontos", async (req, res) => {
  try {
    const result = await db.query<Pedido>(
      `
      SELECT * FROM public.pedidos 
      WHERE status ILIKE ANY($1)
      ORDER BY updated_at DESC LIMIT 10
    `,
      [["%pronto%", "%finalizado%", "%concluido%"]]
    );

    res.json(result.rows);
  } catch {
    res.json([]);
  }
});

// Rotas do banner
app.post("/api/banner/upload", upload.single("banner"), (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "Nenhum arquivo enviado" });
      return;
    }

    console.log("📷 Banner atualizado:", req.file.filename);

    res.json({
      success: true,
      filename: req.file.filename,
      url: `/uploads/${req.file.filename}`,
    });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    res.status(500).json({ error: "Erro ao fazer upload" });
  }
});

app.get("/api/banner/current", (req, res) => {
  try {
    const uploadDir = "uploads";
    const extensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"];

    for (const ext of extensions) {
      const bannerPath = path.join(uploadDir, `banner${ext}`);
      if (fs.existsSync(bannerPath)) {
        res.json({
          exists: true,
          url: `/uploads/banner${ext}`,
          filename: `banner${ext}`,
        });
        return;
      }
    }

    res.json({ exists: false });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    res.status(500).json({ error: "Erro ao verificar banner" });
  }
});

app.delete("/api/banner/delete", (req, res) => {
  try {
    const uploadDir = "uploads";
    const extensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"];

    let deleted = false;
    for (const ext of extensions) {
      const bannerPath = path.join(uploadDir, `banner${ext}`);
      if (fs.existsSync(bannerPath)) {
        fs.unlinkSync(bannerPath);
        deleted = true;
        console.log("🗑️ Banner removido:", `banner${ext}`);
      }
    }

    if (deleted) {
      res.json({ success: true, message: "Banner removido" });
    } else {
      res.status(404).json({ error: "Nenhum banner encontrado" });
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    res.status(500).json({ error: "Erro ao remover banner" });
  }
});

// WebSocket
io.on("connection", (socket) => {
  console.log("Cliente conectado:", socket.id);
  socket.on("disconnect", () => console.log("Cliente saiu:", socket.id));
});

// Polling híbrido - STATUS + UPDATED_AT (mais robusto)
let ultimaVerificacao = new Date();
const TEMPO_INATIVIDADE = 3 * 60 * 60 * 1000; // 3 horas em ms
let jaLimpouPorInatividade = false;

setInterval(async () => {
  try {
    // Busca pedidos que mudaram recentemente (updated_at)
    const result = await db.query<Pedido>(
      `
      SELECT id, senha, status, updated_at 
      FROM public.pedidos 
      WHERE updated_at > $1
      ORDER BY updated_at DESC
    `,
      [ultimaVerificacao]
    );

    if (result.rows.length > 0) {
      console.log(`🔄 ${result.rows.length} pedido(s) alterado(s) recentemente:`);

      result.rows.forEach((pedido) => {
        console.log(
          `   • Pedido ${pedido.senha}: ${pedido.status} (${new Date(
            pedido.updated_at!
          ).toLocaleTimeString()})`
        );

        // Destaca se ficou pronto
        if (
          pedido.status.toLowerCase().includes("pronto") ||
          pedido.status.toLowerCase().includes("finalizado") ||
          pedido.status.toLowerCase().includes("concluido")
        ) {
          console.log(`   🎉 PEDIDO ${pedido.senha} FICOU PRONTO!`);
        }
      });

      console.log("📡 Emitindo atualização via WebSocket...");
      io.emit("pedido_update");
      
      // Reset flag de limpeza - houve atividade!
      jaLimpouPorInatividade = false;
      
    } else {
      // SEM atividade recente - verifica se precisa limpar
      const agora = new Date();
      const tempoSemAtividade = agora.getTime() - ultimaVerificacao.getTime();
      
      if (tempoSemAtividade > TEMPO_INATIVIDADE && !jaLimpouPorInatividade) {
        console.log('Período de inatividade detectado (3h) - limpando tela');
        io.emit('novo_periodo');
        jaLimpouPorInatividade = true; // Evita múltiplas limpezas
      }
    }

    ultimaVerificacao = new Date();
  } catch (error) {
    console.error("Erro no polling:", error);
  }
}, 2000); // A cada 2 segundos

// Start server
const PORT = Number(process.env.PORT) || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
