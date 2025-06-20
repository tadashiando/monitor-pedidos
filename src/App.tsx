import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import "./App.css";

// Tipo simples
interface Pedido {
  id: number;
  senha: string;
  nome_cliente: string;
  status: string;
  created_at?: string;
  updated_at?: string;
}

function App() {
  // Estado simples
  const [pedidosAndamento, setPedidosAndamento] = useState<Pedido[]>([]);
  const [ultimoPedidoPronto, setUltimoPedidoPronto] = useState<Pedido | null>(
    null
  );
  const [pedidosProntos, setPedidosProntos] = useState<Pedido[]>([]);

  const audioRef = useRef<HTMLAudioElement>(null);

  // Buscar dados
  const buscarDados = async () => {
    try {
      console.log("🔄 Buscando dados...");

      const [res1, res2, res3] = await Promise.all([
        fetch("http://localhost:3001/api/pedidos/andamento"),
        fetch("http://localhost:3001/api/pedidos/ultimo-pronto"),
        fetch("http://localhost:3001/api/pedidos/prontos"),
      ]);

      if (!res1.ok || !res2.ok || !res3.ok) {
        throw new Error("Erro na resposta da API");
      }

      const andamento = await res1.json();
      const ultimoPronto = await res2.json();
      const prontos = await res3.json();

      console.log("📊 Dados recebidos:", {
        andamento: andamento.length,
        ultimoPronto: ultimoPronto?.id,
        prontos: prontos.length,
      });

      setPedidosAndamento(andamento);
      setUltimoPedidoPronto(ultimoPronto);
      setPedidosProntos(prontos);
    } catch (error) {
      console.error("❌ Erro ao buscar dados:", error);
    }
  };

  // WebSocket
  useEffect(() => {
    const socket = io("http://localhost:3001");

    socket.on("connect", () => {
      buscarDados();
    });

    socket.on("pedido_update", () => {
      console.log("🔔 Recebeu atualização via socket!");
      buscarDados();
      // Tocar som
      if (audioRef.current) {
        audioRef.current.play().catch(() => {});
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Função de formatação simples
  const hora = (timestamp?: string) => {
    if (!timestamp) return "--:--";
    return new Date(timestamp).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="app">
      <div className="container">
        {/* Coluna 1: Em Andamento */}
        <div className="coluna">
          <h2>EM PREPARAÇÃO ({pedidosAndamento.length})</h2>
          <div className="lista">
            {pedidosAndamento.slice(0, 6).map((pedido) => (
              <div key={pedido.id} className="card andamento">
                <div className="senha">{pedido.senha}</div>
                <div className="cliente">{pedido.nome_cliente}</div>
                <div className="hora">{hora(pedido.created_at)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Coluna 2: Último Pronto */}
        <div className="coluna">
          <h2>SEU PEDIDO ESTÁ PRONTO</h2>
          {ultimoPedidoPronto ? (
            <div className="card pronto destaque">
              <div className="senha">{ultimoPedidoPronto.senha}</div>
              <div className="cliente">{ultimoPedidoPronto.nome_cliente}</div>
              <div className="hora">{hora(ultimoPedidoPronto.updated_at)}</div>
            </div>
          ) : (
            <div className="vazio">Nenhum pedido pronto</div>
          )}
        </div>

        {/* Coluna 3: Prontos Anteriores */}
        <div className="coluna">
          <h2>JÁ CHAMADOS</h2>
          <div className="lista">
            {pedidosProntos.slice(1, 7).map((pedido) => (
              <div key={pedido.id} className="card pronto">
                <div className="senha">{pedido.senha}</div>
                <div className="cliente">{pedido.nome_cliente}</div>
                <div className="hora">{hora(pedido.updated_at)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Som */}
      <audio ref={audioRef} preload="auto">
        <source
          src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEaBDaQ2vHWeycEKHfH7tuQQAoUXrTp66hVFApGn+DyvmEaBDaQ2vHWeycEKGfH7tuQQAoUXrTp66hVFApGn+DyvmEaBDaQ2vHWeycEKHfH7tuQQAoUXrTp66hVFApGn+DyvmEaBDaQ2vHWeycEKHfH7tuQQAoUXrTp66hVFApGn+DyvmEaBDaQ2vHWeycEKHfH7tuQQAoUXrTp66hVFApGn+DyvmEaBDaQ2vHWeycEKHfH7tuQQAoUXrTp66hVFApGn+DyvmEaBDaQ2vHWeycEKHfH7tuQQAoUXrTp66hVFApGn+DyvmEaBDaQ2vHWeycEKHfH7tuQQAoUXrTp66hVFApGn+DyvmEaBDaQ2vHWeycEKHfH7tuQQAoUXrTp66hVFApGn+DyvmEaBDaQ2vHWeycEKHfH7tuQQAoUXrTp66hVFApGn+DyvmEaBDaQ2vHWeycEKHfH7tuQQAoUXrTp66hVFApGn+DyvmEaBDaQ2vHWeycEKHfH7tuQQAoUXrTp66hVFApGn+DyvmEaBDaQ2vHWeycEKHfH7tuQQAoUXrTp66hVFApGn+DyvmEaBDaQ2vHWeycEKHfH7tuQQAoUXrTp66hVFApGn+DyvmEaBDaQ2vHWeycEKHfH7tuQQAoUXrTp66hVFApGn+DyvmEaBDaQ2vHWeycEKHfH7tuQQAoUXrTp66hVFApGn+DyvmEaBDaQ2vHWeycEKHfH7tuQQAoUXrTp66hVFApGn+DyvmEaBDaQ2vHWeycEKHfH7tuQQAoUXrTp66hVFApGn+DyvmEaBDaQ2vHWeycEKHfH7tuQQAoUXrTp66hVFApGn+DyvmEaBDaQ2vHWeycEKHfH7tuQQAoUXrTp66hVFApGn+DyvmEaBDaQ2vHWeycEKHfH7tuQQAoUXrTp66hVFApGn+DyvmEaBDaQ2vHWeycEKHfH7tuQQAoUXrTp66hVFApGn+DyvmEaBDaQ2vHWeycEKHfH7tuQQAoUXrTp66hVFApGn+DyvmEaBDaQ2vHWeycEKHfH7tuQQAoUXrTp66hVFApGn+DyvmEaBDaQ2vHWeycEKHfH7tuQQAoUXrTp66hVFApGn+DyvmEaBDaQ2vHWeycEKHfH7tuQQAoUXrTp66hVFApGn+DyvmEaBDaQ2vHWe="
          type="audio/wav"
        />
      </audio>
    </div>
  );
}

export default App;
