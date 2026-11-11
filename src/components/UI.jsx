import { createPortal } from "react-dom";

export function Badge({ children, tone = "neutral" }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function StatCard({ label, value, sub, icon: Icon }) {
  return (
    <div className="stat-card">
      <div className="stat-card-top">
        <span className="stat-label">{label}</span>
        {Icon && <Icon size={16} strokeWidth={1.75} className="stat-icon" />}
      </div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

export function Field({ label, required, children, hint }) {
  return (
    <label className="field">
      <span className="field-label">{label}{required && <span className="req">*</span>}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

// Fundo das janelas (modais) de edição. Vai direto para o <body>: dentro do
// conteúdo do app ele ficaria abaixo do cabeçalho fixo (o conteúdo forma uma
// camada própria), e no celular o cabeçalho alto cobria o topo da janela.
export function ModalFundo({ onFechar, children }) {
  return createPortal(
    <div className="modal-fundo" onMouseDown={(e) => { if (e.target === e.currentTarget) onFechar(); }}>
      {children}
    </div>,
    document.body,
  );
}
