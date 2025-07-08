import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "./admin-panel.css";

const AdminPanel = () => {
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Buscar banner atual
  const buscarBanner = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/banner/current");
      if (res.ok) {
        const data = await res.json();
        if (data.exists) {
          setBannerUrl(`http://localhost:3001${data.url}?t=${Date.now()}`);
        } else {
          setBannerUrl(null);
        }
      }
    } catch (error) {
      console.error("Erro ao buscar banner:", error);
    }
  };

  useEffect(() => {
    buscarBanner();
  }, []);

  // Upload do banner
  const handleFileUpload = async (file: File) => {
    setUploading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append("banner", file);

    try {
      const res = await fetch("http://localhost:3001/api/banner/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        setMessage({ type: "success", text: "Banner atualizado com sucesso!" });
        buscarBanner();
      } else {
        setMessage({ type: "error", text: "Erro ao fazer upload do banner" });
      }
    } catch (error) {
      console.error(error);
      setMessage({ type: "error", text: "Erro ao conectar com o servidor" });
    }

    setUploading(false);
  };

  // Remover banner
  const handleRemoveBanner = async () => {
    if (!confirm("Tem certeza que deseja remover o banner?")) return;

    try {
      const res = await fetch("http://localhost:3001/api/banner/delete", {
        method: "DELETE",
      });

      if (res.ok) {
        setMessage({ type: "success", text: "Banner removido com sucesso!" });
        setBannerUrl(null);
      } else {
        setMessage({ type: "error", text: "Erro ao remover banner" });
      }
    } catch (error) {
      console.error(error);
      setMessage({ type: "error", text: "Erro ao conectar com o servidor" });
    }
  };

  // Drag and drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="admin-page">
      <div className="admin-container">
        <div className="admin-header">
          <h1>🎨 Administração do Banner</h1>
          <p>
            Gerencie o banner promocional que aparece na parte inferior do
            monitor
          </p>
        </div>

        {/* Banner atual */}
        {bannerUrl && (
          <div className="current-banner">
            <h3>Banner Atual:</h3>
            <img
              src={bannerUrl}
              alt="Banner atual"
              className="banner-preview"
            />
            <br />
            <button
              onClick={handleRemoveBanner}
              className="button button-danger"
              style={{ marginTop: "1rem" }}
            >
              🗑️ Remover Banner
            </button>
          </div>
        )}

        {/* Área de upload */}
        <div className="upload-section">
          <h3>Enviar Novo Banner:</h3>
          <div
            className="upload-area"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => document.getElementById("file-input")?.click()}
          >
            <div className="upload-icon">📁</div>
            <div className="upload-text">
              {uploading ? "Enviando..." : "Clique aqui ou arraste uma imagem"}
            </div>
            <div className="upload-hint">
              Formatos aceitos: JPG, PNG, GIF, WEBP (máx. 5MB). Resolução ideal:
              1920 x 250
            </div>
          </div>

          <input
            id="file-input"
            type="file"
            className="file-input"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
            }}
          />
        </div>

        {/* Mensagens */}
        {message && (
          <div
            className={
              message.type === "success" ? "success-message" : "error-message"
            }
          >
            {message.text}
          </div>
        )}

        {/* Botões */}
        <div style={{ textAlign: "center", marginTop: "2rem" }}>
          <Link to="/" className="button button-secondary">
            ← Voltar ao Monitor
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
