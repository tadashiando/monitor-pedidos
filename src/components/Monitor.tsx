import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import type { Pedido } from "../types/Pedido";
import "./monitor.css";

function Monitor() {
  const [pedidosAndamento, setPedidosAndamento] = useState<Pedido[]>([]);
  const [ultimoPedidoPronto, setUltimoPedidoPronto] = useState<Pedido | null>(
    null
  );
  const [pedidosProntos, setPedidosProntos] = useState<Pedido[]>([]);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [ultimoDestaqueId, setUltimoDestaqueId] = useState<number | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);

  // Buscar dados dos pedidos
  const buscarDados = async () => {
    try {
      const [res1, res2, res3] = await Promise.all([
        fetch("http://localhost:3001/api/pedidos/andamento"),
        fetch("http://localhost:3001/api/pedidos/ultimo-pronto"),
        fetch("http://localhost:3001/api/pedidos/prontos"),
      ]);

      if (res1.ok && res2.ok && res3.ok) {
        const andamento = await res1.json();
        const ultimoPronto = await res2.json();
        const prontos = await res3.json();

        setPedidosAndamento(andamento);
        setUltimoPedidoPronto(ultimoPronto);
        setPedidosProntos(prontos);
      }
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
    }
  };

  // Buscar banner atual
  const buscarBanner = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/banner/current");
      if (res.ok) {
        const data = await res.json();
        if (data.exists) {
          setBannerUrl(`http://localhost:3001${data.url}?t=${Date.now()}`);
        }
      }
    } catch (error) {
      console.error("Erro ao buscar banner:", error);
    }
  };

  const getDisplayText = (pedido: Pedido): string => {
    if (pedido.nome_cliente && pedido.nome_cliente.trim() !== "") {
      return pedido.nome_cliente.trim();
    }

    if (pedido.senha && pedido.senha.trim() !== "") {
      return pedido.senha.trim();
    }

    return `#${pedido.id}`;
  };

  // WebSocket
  useEffect(() => {
    const socket = io("http://localhost:3001");

    socket.on("connect", () => {
      buscarDados();
    });

    socket.on("pedido_update", () => {
      buscarDados();
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (ultimoPedidoPronto && ultimoPedidoPronto.id !== ultimoDestaqueId) {
      if (ultimoDestaqueId !== null) {
        if (audioRef.current) {
          audioRef.current.play().catch(() => {});
        }
      }
      setUltimoDestaqueId(ultimoPedidoPronto.id);
    } else if (!ultimoPedidoPronto) {
      setUltimoDestaqueId(null);
    }
  }, [ultimoPedidoPronto, ultimoDestaqueId]);

  useEffect(() => {
    buscarBanner();
  }, []);

  return (
    <div className="app">
      <div className="container">
        {/* Coluna 1: Em Preparo */}
        <div className="coluna">
          <h2>Em Preparo</h2>
          <div className="lista">
            {pedidosAndamento.slice(0, 6).map((pedido) => (
              <div key={pedido.id} className="nome-item">
                {getDisplayText(pedido)}
              </div>
            ))}
          </div>
        </div>

        {/* Coluna 2: Pedidos Prontos */}
        <div className="coluna">
          <h2>Pedidos Prontos!</h2>
          <div className="lista">
            {/* Último pedido pronto em destaque */}
            {ultimoPedidoPronto && (
              <div className="nome-item destaque">
                {getDisplayText(ultimoPedidoPronto)}
              </div>
            )}

            {/* Outros pedidos prontos */}
            {pedidosProntos.slice(1, 5).map((pedido) => (
              <div key={pedido.id} className="nome-item">
                {getDisplayText(pedido)}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Banner inferior */}
      <div className="banner">
        {bannerUrl ? (
          <img src={bannerUrl} alt="Banner promocional" />
        ) : (
          <div className="banner-placeholder">
            Espaço para banner promocional
          </div>
        )}
      </div>

      {/* Som */}
      <audio ref={audioRef} preload="auto">
        <source src="/ding-dong.wav" type="audio/wav" />
      </audio>
    </div>
  );
}

export default Monitor;
