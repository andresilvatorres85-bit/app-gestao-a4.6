import { useState, useMemo } from "react";
import { ExternalLink, Plus, Pencil, Trash2, X, Save } from "lucide-react";
import { useLegislacao } from "./useLegislacao.js";
import { useRecebimento } from "./useRecebimento.js";
import { useContatos } from "./useContatos.js";
import { useRotina } from "./useRotina.js";
import Recebimento from "./Recebimento.jsx";
import Contatos from "./Contatos.jsx";
import RotinaAsseOrc from "./RotinaAsseOrc.jsx";
import Conjuntura from "./Conjuntura.jsx";
import { useConjuntura } from "./useConjuntura.js";
import { useAcesso } from "../acessos.js";

// Cores por tipo de legislação (na ordem das seções). Cada seção usa uma cor
// no título e na borda/realce dos seus cards.
const PALETA_SECOES = ["#3B6FB0", "#3F9D6B", "#C6543F", "#7A5AC2", "#C79A3A", "#3AA6A6", "#C25A93"];
// Seções padrão de legislação (opções da lista suspensa ao criar/editar).
const SECOES_PADRAO = ["Legislação principal", "Legislação de emendas", "Execução orçamentária", "Legislação complementar"];

// Módulo CONHECIMENTO: abas "Legislação", "Recebimento Função", "Rotina Asse
// Orç", "Contatos" e "Conjuntura".
export default function Conhecimento({ session }) {
  const [aba, setAba] = useState("legislacao");
  const legislacao = useLegislacao(session);
  const recebimento = useRecebimento(session);
  const contatos = useContatos(session);
  const rotina = useRotina(session);
  const conjuntura = useConjuntura(session);

  const { pode } = useAcesso();
  const ABAS = [
    ["legislacao", "Legislação"],
    ["recebimento", "Recebimento Função"],
    ["rotina", "Rotina Asse Orç"],
    ["contatos", "Contatos"],
    ["conjuntura", "Conjuntura"],
  ].filter(([id]) => pode(`conhecimento.${id}`));
  // Aba atual retirada do usuário → primeira liberada.
  const atual = ABAS.some(([id]) => id === aba) ? aba : ABAS[0]?.[0];

  return (
    <div className="view-pad conhec-wrap">
      <div className="conhec-subnav">
        {ABAS.map(([id, rot]) => (
          <button key={id} className={`chip ${atual === id ? "chip-active" : ""}`} onClick={() => setAba(id)}>{rot}</button>
        ))}
      </div>
      {atual === "legislacao" && <Legislacao leg={legislacao} />}
      {atual === "recebimento" && <Recebimento rec={recebimento} />}
      {atual === "rotina" && <RotinaAsseOrc rotina={rotina} />}
      {atual === "contatos" && <Contatos contatos={contatos} />}
      {atual === "conjuntura" && <Conjuntura conjuntura={conjuntura} />}
    </div>
  );
}

function Legislacao({ leg }) {
  const { itens = [], carregado, erro, inserir, atualizar, excluir } = leg || {};
  const [modal, setModal] = useState(null); // {id?, secao, nome, url, descricao}

  // Agrupa por seção, preservando a ordem (menor pos primeiro). Cada seção
  // recebe uma cor da paleta (para o título e a borda dos cards).
  const grupos = useMemo(() => {
    const mapa = new Map();
    for (const it of itens) {
      if (!mapa.has(it.secao)) mapa.set(it.secao, []);
      mapa.get(it.secao).push(it);
    }
    return [...mapa.entries()].map(([titulo, lista], i) => ({ titulo, lista, cor: PALETA_SECOES[i % PALETA_SECOES.length] }));
  }, [itens]);

  const secoes = useMemo(() => [...new Set(itens.map((i) => i.secao).filter(Boolean))], [itens]);

  function novo() { setModal({ secao: grupos[0]?.titulo || "", nome: "", url: "", descricao: "" }); }
  function editar(it) { setModal({ id: it.id, secao: it.secao, nome: it.nome, url: it.url, descricao: it.descricao }); }

  return (
    <div className="leg-grupos">
      <div className="leg-topo">
        <p className="page-sub leg-intro">
          Clique no nome da norma para abrir o texto oficial. Passe o mouse sobre um item para editar ou excluir.
        </p>
        <button className="btn btn-primary btn-sm leg-add" onClick={novo}><Plus size={15} /> Nova legislação</button>
      </div>

      {erro && (
        <div className="lexor-aviso-erro">
          A base de legislação não pôde ser lida ou gravada. Rode o script
          <code> supabase_legislacao.sql </code> no SQL Editor do Supabase para criar a tabela.
        </div>
      )}

      {!carregado ? (
        <div className="loading-state">Carregando legislação…</div>
      ) : grupos.length === 0 ? (
        <p className="leg-vazio">Nenhuma legislação cadastrada. Use “Nova legislação” para incluir.</p>
      ) : grupos.map((sec) => (
        <section key={sec.titulo} className="leg-grupo" style={{ "--leg-cor": sec.cor, "--leg-cor-bg": sec.cor + "14" }}>
          <h2 className="leg-grupo-tit">{sec.titulo}</h2>
          <ul className="leg-lista">
            {sec.lista.map((it) => (
              <li key={it.id} className="leg-item">
                <div className="leg-item-cab">
                  {it.url ? (
                    <a className="leg-nome" href={it.url} target="_blank" rel="noopener noreferrer" title={`Abrir: ${it.nome}`}>
                      <span>{it.nome}</span>
                      <ExternalLink size={13} className="leg-nome-ic" />
                    </a>
                  ) : (
                    <span className="leg-nome leg-nome-sem">{it.nome}</span>
                  )}
                  <div className="leg-acoes">
                    <button className="icon-btn" title="Editar" onClick={() => editar(it)}><Pencil size={14} /></button>
                    <button className="icon-btn" title="Excluir"
                      onClick={() => { if (confirm(`Excluir "${it.nome}"?`)) excluir?.(it.id); }}><Trash2 size={14} /></button>
                  </div>
                </div>
                {it.descricao && <p className="leg-desc">{it.descricao}</p>}
              </li>
            ))}
          </ul>
        </section>
      ))}

      {modal && (
        <ModalLegislacao estado={modal} secoes={secoes}
          onFechar={() => setModal(null)}
          onSalvar={async (d) => {
            const res = d.id ? await atualizar(d.id, d) : await inserir(d);
            if (!res?.error) setModal(null);
            return res;
          }} />
      )}
    </div>
  );
}

function ModalLegislacao({ estado, secoes, onFechar, onSalvar }) {
  const [f, setF] = useState(estado);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const opcoesSecao = useMemo(() => [...new Set([...SECOES_PADRAO, ...secoes])], [secoes]);
  function onSecao(e) {
    const v = e.target.value;
    setF((s) => ({ ...s, secao: v === "__outra__" ? "" : v }));
  }

  async function salvar(ev) {
    ev.preventDefault();
    if (!f.nome.trim()) { setErro("Informe o nome da legislação."); return; }
    setSalvando(true);
    const res = await onSalvar(f);
    setSalvando(false);
    if (res?.error) setErro("Não foi possível salvar: " + (res.error.message || "erro"));
  }

  return (
    <div className="modal-fundo" onMouseDown={(e) => { if (e.target === e.currentTarget) onFechar(); }}>
      <form className="modal-caixa" onSubmit={salvar}>
        <div className="modal-cab">
          <h2>{estado.id ? "Editar legislação" : "Nova legislação"}</h2>
          <button type="button" className="icon-btn" onClick={onFechar}><X size={18} /></button>
        </div>
        <div className="modal-corpo cal-campo-col">
          <div className="cal-campo">
            <span className="cal-campo-rot">Seção</span>
            <select className="input" value={opcoesSecao.includes(f.secao) ? f.secao : "__outra__"} onChange={onSecao}>
              {opcoesSecao.map((s) => <option key={s} value={s}>{s}</option>)}
              <option value="__outra__">Outra seção…</option>
            </select>
            {(!opcoesSecao.includes(f.secao)) && (
              <input className="input leg-secao-nova" value={f.secao} onChange={set("secao")}
                placeholder="Nome da nova seção" autoFocus />
            )}
          </div>
          <div className="cal-campo">
            <span className="cal-campo-rot">Nome</span>
            <input className="input" autoFocus value={f.nome} onChange={set("nome")} placeholder="Ex: Lei Complementar 210-2024" />
          </div>
          <div className="cal-campo">
            <span className="cal-campo-rot">Link (URL)</span>
            <input className="input" value={f.url} onChange={set("url")} placeholder="https://…" inputMode="url" />
          </div>
          <div className="cal-campo">
            <span className="cal-campo-rot">Descrição</span>
            <textarea className="input textarea" rows={4} value={f.descricao} onChange={set("descricao")} placeholder="Do que trata a norma…" />
          </div>
          {erro && <div className="alert alert-error">{erro}</div>}
        </div>
        <div className="modal-rodape">
          <span />
          <div className="cal-modal-acoes">
            <button type="button" className="btn btn-ghost" onClick={onFechar}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={salvando}><Save size={15} /> {salvando ? "Salvando…" : "Salvar"}</button>
          </div>
        </div>
      </form>
    </div>
  );
}
