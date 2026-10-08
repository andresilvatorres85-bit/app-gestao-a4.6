import { useState } from "react";
import { Check, RotateCcw } from "lucide-react";
import {
  carregarConfigLocal, salvarConfigLocal, removerConfigLocal,
  textosDe, listaDeTexto, cargosDeTexto,
} from "../loa/estrategiaCfg.js";

const CAMPOS = [
  ["removidos", "Removidos do mandato", "Aparecem em 2024–2026, mas não estão mais em exercício."],
  ["whitelist", "Whitelist de senadores ativos", "Em exercício, sem emenda recente à Defesa."],
  ["naoReeleitos", "Não reeleitos nas eleições de 2026", "Recebem o selo vermelho NÃO REELEITO."],
  ["cargos2027", "Cargo em 2027 (quem muda de cargo)", "Formato NOME = CARGO, um por linha."],
];

// Listas de mandato da aba LOA › Estratégia, salvas neste navegador.
export default function EstrategiaConfigPanel() {
  const [salva, setSalva] = useState(() => carregarConfigLocal());
  const [txt, setTxt] = useState(() => textosDe(salva));
  const [aviso, setAviso] = useState("");

  const salvar = () => {
    const novo = {
      removidos: listaDeTexto(txt.removidos), whitelist: listaDeTexto(txt.whitelist),
      naoReeleitos: listaDeTexto(txt.naoReeleitos), cargos2027: cargosDeTexto(txt.cargos2027),
    };
    salvarConfigLocal(novo);
    setSalva(novo);
    setTxt(textosDe(novo));
    setAviso("Listas salvas.");
  };
  const restaurar = () => {
    removerConfigLocal();
    setSalva(null);
    setTxt(textosDe(null));
    setAviso("Listas restauradas para o padrão.");
  };

  return (
    <>
      <p className="config-help">
        Listas usadas nos relatórios da aba Estratégia. Um nome por linha, em CAIXA ALTA,
        como aparece no campo Autor. Salvo neste navegador
        {salva ? " · configuração personalizada em uso" : " · usando o padrão"}.
      </p>
      <div className="cfg-listas">
        {CAMPOS.map(([k, rotulo, ajuda]) => (
          <label key={k} className="cfg-lista">
            <span className="field-label">{rotulo}</span>
            <span className="cfg-lista-ajuda">{ajuda}</span>
            <textarea className="input" rows={7} value={txt[k]}
              onChange={(e) => { setTxt({ ...txt, [k]: e.target.value }); setAviso(""); }} />
          </label>
        ))}
      </div>
      <div className="cfg-acoes">
        <button className="btn btn-primary btn-sm" onClick={salvar}><Check size={15} /> Salvar</button>
        <button className="btn btn-ghost btn-sm" onClick={restaurar}><RotateCcw size={15} /> Restaurar padrão</button>
        {aviso && <span className="cfg-aviso">{aviso}</span>}
      </div>
    </>
  );
}
