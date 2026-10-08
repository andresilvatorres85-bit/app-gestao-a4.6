import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { RefreshCw, Check, X, AlertTriangle } from "lucide-react";
import { supabase } from "../lib/supabaseClient.js";

// Botão "Atualizar dados" do cabeçalho. Dispara o workflow de deploy (via a
// Edge Function "atualizar-lexor"), que baixa as planilhas do repositório de
// dados (LEXOR, LOA_despesa_execucao, PLOA, histórico de emendas), regenera as
// bases e republica o app. O botão acompanha o versao.json publicado pelo
// workflow e avisa quando a nova versão entrou no ar.
const INTERVALO = 20000;          // consulta a cada 20 s
const LIMITE = 20 * 60 * 1000;    // desiste de acompanhar após 20 min

async function lerVersao() {
  try {
    const r = await fetch(`./versao.json?t=${Date.now()}`, { cache: "no-store" });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

const fmtData = (iso) => {
  const d = new Date(iso);
  return isNaN(d) ? "" : d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
};

export default function AtualizarDados() {
  const [estado, setEstado] = useState("ocioso"); // ocioso | disparando | processando | pronto | erro
  const [msg, setMsg] = useState("");
  const [versao, setVersao] = useState(null);
  const base = useRef(null);  // versão no ar quando o botão foi clicado
  const inicio = useRef(0);

  useEffect(() => { lerVersao().then(setVersao); }, []);

  useEffect(() => {
    if (estado !== "processando") return;
    const id = setInterval(async () => {
      const v = await lerVersao();
      if (v && v.run !== base.current?.run) {
        setVersao(v);
        setEstado("pronto");
        setMsg("Dados atualizados e publicados. Recarregue a página para usar a nova versão.");
      } else if (Date.now() - inicio.current > LIMITE) {
        setEstado("erro");
        setMsg("A atualização está demorando mais que o normal. Tente recarregar a página mais tarde.");
      }
    }, INTERVALO);
    return () => clearInterval(id);
  }, [estado]);

  async function atualizar() {
    if (estado === "disparando" || estado === "processando") return;
    setEstado("disparando");
    setMsg("");
    base.current = await lerVersao();
    inicio.current = Date.now();
    const { error } = await supabase.functions.invoke("atualizar-lexor");
    if (error) {
      setEstado("erro");
      setMsg("Não foi possível iniciar a atualização: " + (error.message || error) +
        " (verifique a função atualizar-lexor e o token no Supabase).");
      return;
    }
    setEstado("processando");
    setMsg("Buscando atualizações nas planilhas do repositório e republicando o aplicativo. " +
      "Leva cerca de 5 a 10 minutos; você pode continuar usando o app.");
  }

  const ocupado = estado === "disparando" || estado === "processando";
  const titulo = "Busca atualizações nas planilhas do repositório de dados e republica o aplicativo" +
    (versao?.geradoEm ? ` · dados publicados em ${fmtData(versao.geradoEm)}` : "");

  return (
    <>
      <button className="logout-btn" onClick={atualizar} disabled={ocupado} title={titulo}>
        <RefreshCw size={14} className={ocupado ? "girando" : ""} />
        <span className="logout-txt">{ocupado ? "Atualizando…" : "Atualizar dados"}</span>
      </button>
      {msg && createPortal(
        <div className={`atualiz-painel atualiz-${estado}`} role="status">
          <span className="atualiz-icone">
            {estado === "pronto" ? <Check size={16} /> : estado === "erro" ? <AlertTriangle size={16} /> : <RefreshCw size={16} className="girando" />}
          </span>
          <div className="atualiz-texto">
            <p>{msg}</p>
            {estado === "pronto" && (
              <button className="btn btn-primary btn-sm" onClick={() => window.location.reload()}>Recarregar agora</button>
            )}
          </div>
          {!ocupado && (
            <button className="icon-btn" title="Fechar" onClick={() => { setMsg(""); setEstado("ocioso"); }}><X size={15} /></button>
          )}
        </div>,
        document.body
      )}
    </>
  );
}
