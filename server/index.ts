import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { Client } from "pg";
import dotenv from "dotenv";
import multer from "multer";
import path from "path";
import fs from "fs";

dotenv.config();

// Setup
const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://127.0.0.1:5173", "file://"],
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

// 🔥 NOVO: Caminho dos arquivos estáticos (sempre na pasta do executável)
const staticPath = path.join(process.cwd(), "dist");

// 🔥 NOVO: Servir arquivos estáticos do frontend
app.use(express.static(staticPath));

// Servir arquivos estáticos (banner)
const uploadsPath = path.join(process.cwd(), "uploads");

app.use("/uploads", express.static(uploadsPath));

// Configurar multer para upload do banner
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(uploadsPath)) {
      fs.mkdirSync(uploadsPath, { recursive: true });
    }
    cb(null, uploadsPath);
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
    const result = await db.query(`
      SELECT id, nomecliente, horapedidoefetuado, horaempreparo
      FROM public.contamesa 
      WHERE horaempreparo IS NOT NULL 
      AND horapronto IS NULL
      ORDER BY horaempreparo ASC LIMIT 20
    `);

    const pedidos = result.rows.map((row) => ({
      id: row.id,
      senha: `#${row.id}`,
      nome_cliente: row.nomecliente,
      status: "preparando",
      created_at: row.horapedidoefetuado,
      updated_at: row.horaempreparo,
    }));

    res.json(pedidos);
  } catch {
    res.json([]);
  }
});

app.get("/api/pedidos/ultimo-pronto", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT id, nomecliente, horapedidoefetuado, horapronto
      FROM public.contamesa 
      WHERE horapronto IS NOT NULL
      ORDER BY horapronto DESC LIMIT 1
    `);

    const pedido = result.rows[0];
    if (pedido) {
      res.json({
        id: pedido.id,
        senha: `#${pedido.id}`,
        nome_cliente: pedido.nomecliente,
        status: "pronto",
        created_at: pedido.horapedidoefetuado,
        updated_at: pedido.horapronto,
      });
    } else {
      res.json(null);
    }
  } catch {
    res.json(null);
  }
});

app.get("/api/pedidos/prontos", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT id, nomecliente, horapedidoefetuado, horapronto
      FROM public.contamesa 
      WHERE horapronto IS NOT NULL
      ORDER BY horapronto DESC LIMIT 10
    `);

    const pedidos = result.rows.map((row) => ({
      id: row.id,
      senha: `#${row.id}`,
      nome_cliente: row.nomecliente,
      status: "pronto",
      created_at: row.horapedidoefetuado,
      updated_at: row.horapronto,
    }));

    res.json(pedidos);
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
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao fazer upload" });
  }
});

app.get("/api/banner/current", (req, res) => {
  try {
    const extensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"];

    for (const ext of extensions) {
      const bannerPath = path.join(uploadsPath, `banner${ext}`);
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
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao verificar banner" });
  }
});

app.delete("/api/banner/delete", (req, res) => {
  try {
    const extensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"];

    let deleted = false;
    for (const ext of extensions) {
      const bannerPath = path.join(uploadsPath, `banner${ext}`);
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
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao remover banner" });
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
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao fazer upload" });
  }
});

app.get("/api/banner/current", (req, res) => {
  try {
    const extensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"];

    for (const ext of extensions) {
      const bannerPath = path.join(uploadsPath, `banner${ext}`);
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
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao verificar banner" });
  }
});

app.delete("/api/banner/delete", (req, res) => {
  try {
    const extensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"];

    let deleted = false;
    for (const ext of extensions) {
      const bannerPath = path.join(uploadsPath, `banner${ext}`);
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
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao remover banner" });
  }
});

// ENDPOINT ULTRA-LEGACY para TVs muito antigas (ES3/ES5 básico))
app.get("/tv", (req, res) => {
  const serverUrl = `${req.protocol}://${req.get("host")}`;

  const ultraLegacyHtml = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Monitor de Pedidos - TV</title>
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <style>
        /* CSS Ultra-básico - compatível com IE6+ */
        /* IMPORTANTE: Usando position absolute em vez de float para evitar problemas de layout */
        * {
            margin: 0;
            padding: 0;
        }
        
        html, body {
            height: 100%;
            width: 100%;
            overflow: hidden;
            font-family: Arial, sans-serif;
            background: #000;
        }
        
        .container {
            width: 100%;
            height: 100%;
            position: relative;
        }
        
        .main-area {
            width: 100%;
            height: 80%; /* 80% para conteúdo, 20% para banner */
            overflow: hidden;
        }
        
        /* Layout sem float - mais confiável para TVs antigas */
        .coluna-preparo {
            position: absolute;
            left: 0;
            top: 0;
            width: 40%;
            height: 100%;
            background: #ff8c00;
            border-right: 3px solid #ccc;
        }
        
        .coluna-prontos {
            position: absolute;
            left: 40%;
            top: 0;
            width: 60%;
            height: 100%;
            background: #28a745;
            border-left: 2px solid #c5c5c5;
        }
        
        .titulo {
            color: white;
            text-align: center;
            padding: 20px 0;
            font-size: 32px;
            font-weight: bold;
            text-transform: uppercase;
        }
        
        .lista {
            padding: 30px;
            background: #f0f0f0;
            height: 85%;
            overflow-y: auto;
        }
        
        .pedido {
            font-size: 40px;
            font-weight: bold;
            color: #000;
            margin-bottom: 25px;
            text-transform: uppercase;
            line-height: 1.2;
        }
        
        .pedido-destaque {
            font-size: 60px;
            text-align: center;
            padding: 20px;
            margin-bottom: 20px;
            border-bottom: 2px solid #c5c5c5;
            font-weight: 900;
            text-transform: uppercase;
        }
        
        .banner-area {
            position: absolute;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 20%;
            background: #2c3e50;
            text-align: center;
        }
        
        .banner-img {
            width: 100%;
            height: 100%;
        }
        
        .banner-placeholder {
            color: #95a5a6;
            font-size: 18px;
            position: absolute;
            top: 50%;
            left: 50%;
            width: 300px;
            margin-left: -150px;
            margin-top: -10px;
        }
        
        /* Removido: .status-box - indicador de status removido */
        
        /* Media query mais simples */
        @media screen and (max-width: 800px) {
            .coluna-preparo {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                height: 40%;
            }
            .coluna-prontos {
                position: absolute;
                left: 0;
                top: 40%;
                width: 100%;
                height: 40%;
            }
            .banner-area {
                position: absolute;
                bottom: 0;
                left: 0;
                width: 100%;
                height: 20%;
            }
            .pedido {
                font-size: 32px;
            }
            .pedido-destaque {
                font-size: 48px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="main-area">
            <div class="coluna-preparo">
                <div class="titulo">Em Preparo</div>
                <div class="lista" id="preparo-lista"></div>
            </div>
            
            <div class="coluna-prontos">
                <div class="titulo">Pedidos Prontos!</div>
                <div class="lista" id="prontos-lista"></div>
            </div>
        </div>
        
        <div class="banner-area" id="banner-area">
            <div class="banner-placeholder">Espaço para banner promocional</div>
        </div>
        
        <!-- Status removido para layout mais limpo -->
    </div>
    
    <script>
        // ========================================
        // JAVASCRIPT ULTRA-COMPATÍVEL (ES3)
        // ========================================
        
        // Configuração global
        var CONFIG = {
            serverUrl: '${serverUrl}',
            updateInterval: 4000,
            maxRetries: 3,
            debug: true
        };
        
        // Estado global
        var ESTADO = {
            ultimoDestaque: null,
            tentativas: 0,
            funcionando: false
        };
        
        // Referências aos elementos
        var ELEMENTOS = {};
        
        // ========================================
        // FUNÇÕES UTILITÁRIAS
        // ========================================
        
        function log(msg) {
            if (CONFIG.debug && window.console && window.console.log) {
                console.log('[TV] ' + msg);
            }
        }
        
        function atualizarStatus(texto, classe) {
            // Função mantida para compatibilidade, mas não exibe nada
            // Status removido para layout mais limpo
        }
        
        function obterTextoExibicao(pedido) {
            // Prioridade: nome_cliente > senha > id
            if (pedido.nome_cliente && pedido.nome_cliente !== '') {
                return pedido.nome_cliente;
            }
            if (pedido.senha && pedido.senha !== '') {
                return pedido.senha;
            }
            return '#' + pedido.id;
        }
        
        // ========================================
        // AJAX ULTRA-COMPATÍVEL
        // ========================================
        
        function criarXHR() {
            var xhr = null;
            try {
                // IE7+, Firefox, Chrome, Safari
                xhr = new XMLHttpRequest();
            } catch (e) {
                try {
                    // IE6
                    xhr = new ActiveXObject('MSXML2.XMLHTTP');
                } catch (e2) {
                    try {
                        // IE5
                        xhr = new ActiveXObject('Microsoft.XMLHTTP');
                    } catch (e3) {
                        log('ERRO: XMLHttpRequest não suportado');
                        return null;
                    }
                }
            }
            return xhr;
        }
        
        function fazerRequisicao(url, sucesso, erro) {
            var xhr = criarXHR();
            if (!xhr) {
                erro('XMLHttpRequest não disponível');
                return;
            }
            
            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        try {
                            // Parse manual do JSON para compatibilidade
                            var dados;
                            if (window.JSON && window.JSON.parse) {
                                dados = JSON.parse(xhr.responseText);
                            } else {
                                // Fallback para eval (não recomendado, mas funciona)
                                dados = eval('(' + xhr.responseText + ')');
                            }
                            sucesso(dados);
                        } catch (ex) {
                            erro('Erro ao processar resposta: ' + ex.message);
                        }
                    } else {
                        erro('Erro HTTP: ' + xhr.status);
                    }
                }
            };
            
            try {
                xhr.open('GET', url, true);
                xhr.setRequestHeader('Accept', 'application/json');
                xhr.send();
            } catch (ex) {
                erro('Erro ao enviar requisição: ' + ex.message);
            }
        }
        
        // ========================================
        // FUNÇÕES DE DADOS
        // ========================================
        
        function carregarPedidos() {
            log('Carregando pedidos...');
            
            // Carregar pedidos em preparo
            fazerRequisicao(
                CONFIG.serverUrl + '/api/pedidos/andamento',
                function(dados) {
                    atualizarListaPreparo(dados);
                    ESTADO.tentativas = 0;
                    if (!ESTADO.funcionando) {
                        ESTADO.funcionando = true;
                        log('Conexão estabelecida com sucesso');
                    }
                },
                function(erro) {
                    log('Erro pedidos preparo: ' + erro);
                    tratarErroConexao();
                }
            );
            
            // Carregar pedidos prontos
            fazerRequisicao(
                CONFIG.serverUrl + '/api/pedidos/prontos',
                function(dados) {
                    atualizarListaProntos(dados);
                },
                function(erro) {
                    log('Erro pedidos prontos: ' + erro);
                }
            );
        }
        
        function carregarBanner() {
            fazerRequisicao(
                CONFIG.serverUrl + '/api/banner/current',
                function(dados) {
                    if (dados.exists) {
                        var bannerArea = ELEMENTOS.bannerArea;
                        bannerArea.innerHTML = '<img src="' + CONFIG.serverUrl + dados.url + '?t=' + 
                                              new Date().getTime() + '" class="banner-img" alt="Banner">';
                    }
                },
                function(erro) {
                    log('Erro ao carregar banner: ' + erro);
                }
            );
        }
        
        // ========================================
        // ATUALIZAÇÃO DA INTERFACE
        // ========================================
        
        function atualizarListaPreparo(pedidos) {
            var html = '';
            var limite = 5; // Limite para TVs antigas
            
            for (var i = 0; i < Math.min(pedidos.length, limite); i++) {
                html += '<div class="pedido">' + obterTextoExibicao(pedidos[i]) + '</div>';
            }
            
            ELEMENTOS.preparoLista.innerHTML = html;
        }
        
        function atualizarListaProntos(pedidos) {
            var html = '';
            
            if (pedidos.length > 0) {
                // Primeiro pedido em destaque
                var primeiro = pedidos[0];
                html += '<div class="pedido-destaque">' + obterTextoExibicao(primeiro) + '</div>';
                
                // Verificar se é novo destaque para tocar som
                if (ESTADO.ultimoDestaque !== primeiro.id) {
                    if (ESTADO.ultimoDestaque !== null) {
                        tocarSom();
                    }
                    ESTADO.ultimoDestaque = primeiro.id;
                }
                
                // Outros pedidos (máximo 3 para TVs antigas)
                var limite = 3;
                for (var i = 1; i < Math.min(pedidos.length, limite + 1); i++) {
                    html += '<div class="pedido">' + obterTextoExibicao(pedidos[i]) + '</div>';
                }
            }
            
            ELEMENTOS.prontosLista.innerHTML = html;
        }
        
        function tocarSom() {
            try {
                // Tentar tocar som se disponível
                var audio = document.getElementById('som-notificacao');
                if (audio && audio.play) {
                    audio.play();
                }
            } catch (ex) {
                log('Erro ao tocar som: ' + ex.message);
            }
        }
        
        // ========================================
        // TRATAMENTO DE ERROS
        // ========================================
        
        function tratarErroConexao() {
            ESTADO.tentativas++;
            ESTADO.funcionando = false;
            
            if (ESTADO.tentativas >= CONFIG.maxRetries) {
                log('Conexão perdida, tentando reconectar em 30 segundos...');
                // Reiniciar após 30 segundos
                setTimeout(function() {
                    ESTADO.tentativas = 0;
                    carregarPedidos();
                }, 30000);
            } else {
                log('Tentativa de reconexão: ' + ESTADO.tentativas + '/' + CONFIG.maxRetries);
            }
        }
        
        // ========================================
        // LOOP PRINCIPAL
        // ========================================
        
        function iniciarLoop() {
            function executarLoop() {
                carregarPedidos();
                setTimeout(executarLoop, CONFIG.updateInterval);
            }
            executarLoop();
        }
        
        // ========================================
        // INICIALIZAÇÃO
        // ========================================
        
        function inicializar() {
            log('Inicializando Monitor TV Ultra-Legacy...');
            
            // Buscar elementos DOM (status removido)
            ELEMENTOS.preparoLista = document.getElementById('preparo-lista');
            ELEMENTOS.prontosLista = document.getElementById('prontos-lista');
            ELEMENTOS.bannerArea = document.getElementById('banner-area');
            
            // Verificar se elementos existem
            if (!ELEMENTOS.preparoLista || !ELEMENTOS.prontosLista) {
                log('ERRO: Elementos DOM não encontrados!');
                return;
            }
            
            // Carregar dados iniciais
            carregarPedidos();
            carregarBanner();
            
            // Iniciar loop de atualização
            iniciarLoop();
            
            log('Monitor TV inicializado com sucesso!');
        }
        
        // ========================================
        // EVENT LISTENERS COMPATÍVEIS
        // ========================================
        
        // Aguardar carregamento da página (compatível com IE6+)
        if (document.addEventListener) {
            document.addEventListener('DOMContentLoaded', inicializar, false);
        } else if (document.attachEvent) {
            document.attachEvent('onreadystatechange', function() {
                if (document.readyState === 'complete') {
                    inicializar();
                }
            });
        } else {
            // Fallback para navegadores muito antigos
            window.onload = inicializar;
        }
        
        // Log de inicialização
        log('Script carregado, aguardando DOM...');
    </script>
    
    <!-- Som de notificação (opcional) -->
    <audio id="som-notificacao" preload="auto" style="display: none;">
        <source src="/ding-dong.wav" type="audio/wav">
    </audio>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(ultraLegacyHtml);
});

app.get(/^(?!\/api).*/, (_req, res) => {
  res.sendFile(path.join(staticPath, "index.html"));
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
    const result = await db.query(
      `SELECT id, nomecliente, horaempreparo, horapronto
        FROM public.contamesa 
        WHERE (horaempreparo > $1 OR horapronto > $1)
        ORDER BY GREATEST(
          COALESCE(horaempreparo, '1970-01-01'), 
          COALESCE(horapronto, '1970-01-01')
        ) DESC
      `,
      [ultimaVerificacao]
    );

    if (result.rows.length > 0) {
      console.log(
        `🔄 ${result.rows.length} pedido(s) alterado(s) recentemente:`
      );

      result.rows.forEach((pedido) => {
        if (
          pedido.horapronto &&
          new Date(pedido.horapronto) > ultimaVerificacao
        ) {
          console.log(
            `   🎉 #${pedido.id} (${pedido.nomecliente}) FICOU PRONTO!`
          );
        } else if (
          pedido.horaempreparo &&
          new Date(pedido.horaempreparo) > ultimaVerificacao
        ) {
          console.log(`   🔥 #${pedido.id} (${pedido.nomecliente}) EM PREPARO`);
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
        console.log("Período de inatividade detectado (3h) - limpando tela");
        io.emit("novo_periodo");
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
  console.log(`📁 Servindo frontend de: ${staticPath}`);
  console.log(`🌐 Acesse: http://localhost:${PORT}`);
});
