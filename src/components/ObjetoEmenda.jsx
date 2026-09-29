import { useState, useEffect, useMemo, useRef } from "react";
import { FileText, Save, X, Check, ChevronDown } from "lucide-react";
import { Field } from "./UI.jsx";
import { UFS, MESES_LONGO } from "../constants.js";
import { todayParts, msgErroSalvar } from "../helpers.js";
import { baixarOficioDocx, ehSenado } from "../objetoEmendaDoc.js";
import { baixarDocAo } from "../objetoEmendaAoDoc.js";
import { carregarEmendasExercito, parlamentaresDoAno, cargoDoParlamentar } from "../parlamentaresLexor.js";
import ObjetoEmendasTabela from "./ObjetoEmendasTabela.jsx";

const CARGOS = ["Deputado Federal", "Deputada Federal", "Senador", "Senadora"];
// Tipos de ajuste. Regras de seleção:
//  - Grupo A (podem ser marcados juntos): Ampliação/Alteração do objeto, Alteração de OM.
//  - "Mudança de Ação Orçamentária (AO)": exclusivo (não convive com nenhum outro).
//  - "Mudança de GND": não convive com AO (mas pode com o grupo A).
const AJUSTE_AO = "Mudança de Ação Orçamentária (AO)";
const AJUSTE_GND = "Mudança de GND";
const AJUSTES = [
  "Ampliação do objeto",
  "Alteração do objeto",
  "Alteração de OM beneficiária",
  AJUSTE_AO,
  AJUSTE_GND,
];

// Campos específicos do documento "AO" (guardados em ao_dados no banco).
const AO_KEYS = [
  "aoObjeto", "aoOm", "aoCnpj", "aoOrgaoBenef", "aoIncorrecao", "aoJanela", "aoValor",
  "aoDeFuncao", "aoDeSubfuncao", "aoDePrograma", "aoDeAcao", "aoDeSubtitulo",
  "aoParaFuncao", "aoParaSubfuncao", "aoParaPrograma", "aoParaAcao", "aoParaSubtitulo",
];
const AO_VAZIO = Object.fromEntries(AO_KEYS.map((k) => [k, ""]));

const VAZIO = {
  parlamentar: "", cargo: "Deputado Federal", partido: "", uf: "",
  oficioNr: "", emenda: "", objetoDe: "", objetoPara: "", ajustes: [],
  gabinete: "", telefone: "", email: "",
  ...AO_VAZIO, aoOrgaoBenef: "Comando do Exército", aoCnpj: "00.394.452/0001-03",
};

export default function ObjetoEmenda({
  itens, inserir, atualizar, excluir, editando, onEditar, onCancelarEdicao,
  partidos = [], autorAtual, emailAtual,
}) {
  const hoje = todayParts();
  const [f, setF] = useState({ ...VAZIO, dia: hoje.d, mes: hoje.m, ano: hoje.y });
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState("");
  const [gerando, setGerando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // Parlamentares que concederam emendas ao Exército (RESULTADO LEXOR → Emendas),
  // vindos do próprio dados.json. A lista é filtrada pelo ano selecionado.
  const [regsEx, setRegsEx] = useState([]);
  const [statusLista, setStatusLista] = useState("carregando");

  useEffect(() => {
    let vivo = true;
    carregarEmendasExercito()
      .then((rs) => { if (vivo) { setRegsEx(rs); setStatusLista("ok"); } })
      .catch(() => { if (vivo) setStatusLista("erro"); });
    return () => { vivo = false; };
  }, []);

  const lista = useMemo(() => parlamentaresDoAno(regsEx, f.ano), [regsEx, f.ano]);
  const mapaNome = useMemo(() => {
    const m = new Map();
    for (const p of lista) if (!m.has(p.nome.toLowerCase())) m.set(p.nome.toLowerCase(), p);
    return m;
  }, [lista]);

  // Ao acionar "editar" (aqui ou no Painel), carrega o lançamento no formulário.
  useEffect(() => {
    if (!editando) return;
    setF({
      ...AO_VAZIO, aoOrgaoBenef: "Comando do Exército", aoCnpj: "00.394.452/0001-03",
      ...(editando.aoDados || {}),
      parlamentar: editando.parlamentar || "", cargo: editando.cargo || "Deputado Federal",
      partido: editando.partido || "", uf: editando.uf || "",
      oficioNr: editando.oficioNr || "", dia: editando.dia || hoje.d, mes: editando.mes || hoje.m, ano: editando.ano || hoje.y,
      emenda: editando.emenda || "", objetoDe: editando.objetoDe || "", objetoPara: editando.objetoPara || "",
      ajustes: (editando.ajuste || "").split(/\s*;\s*/).map((s) => s.trim()).filter(Boolean),
      gabinete: editando.gabinete || "", telefone: editando.telefone || "", email: editando.email || "",
    });
    setErro(""); setOk("");
    if (typeof window !== "undefined") window.scrollTo?.({ top: 0, behavior: "smooth" });
  }, [editando]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k) => (e) => { setF((s) => ({ ...s, [k]: e.target.value })); setErro(""); setOk(""); };

  function selecionarParlamentar(p) {
    setF((s) => ({
      ...s,
      parlamentar: p.nome,
      cargo: cargoDoParlamentar(p) || s.cargo,
      partido: p.partido || s.partido,
      uf: p.uf || s.uf,
    }));
  }

  function onParlamentar(e) {
    const v = e.target.value;
    setF((s) => ({ ...s, parlamentar: v }));
    setErro(""); setOk("");
    const p = mapaNome.get(v.trim().toLowerCase());
    if (p) selecionarParlamentar(p);
  }

  function toggleAjuste(a) {
    setF((s) => {
      const tem = s.ajustes.includes(a);
      let ajustes;
      if (tem) {
        ajustes = s.ajustes.filter((x) => x !== a);           // desmarca
      } else if (a === AJUSTE_AO) {
        ajustes = [AJUSTE_AO];                                 // AO é exclusivo: limpa o resto
      } else {
        // qualquer outro: adiciona e remove o AO (AO não convive com nada)
        ajustes = [...s.ajustes.filter((x) => x !== AJUSTE_AO), a];
      }
      return { ...s, ajustes };
    });
    setErro(""); setOk("");
  }

  function limpar() {
    setF((s) => ({ ...VAZIO, cargo: s.cargo, dia: s.dia, mes: s.mes, ano: s.ano }));
  }

  const ehAO = f.ajustes.includes(AJUSTE_AO);

  function validar(paraSalvar) {
    if (!f.parlamentar.trim()) return "Informe o nome do parlamentar.";
    if (!f.emenda.trim()) return "Informe o número da emenda.";
    if (ehAO) {
      if (!f.aoObjeto.trim()) return "Informe o objeto da emenda.";
    } else if (!f.objetoPara.trim()) {
      return "Informe o novo objeto (PARA).";
    }
    if (paraSalvar && !f.ajustes.length) return "Selecione ao menos um tipo de ajuste (para a consolidação).";
    return "";
  }

  const payloadSalvar = () => ({
    ...f,
    ajuste: f.ajustes.join("; "),
    aoDados: ehAO ? Object.fromEntries(AO_KEYS.map((k) => [k, f[k] || ""])) : null,
  });

  async function gerar() {
    const v = validar(false);
    if (v) { setErro(v); return; }
    setGerando(true);
    try {
      if (ehAO) {
        await baixarDocAo(f);
        setOk("Documento (AO) gerado — verifique os downloads.");
      } else {
        await baixarOficioDocx(f);
        setOk("Ofício gerado — verifique os downloads.");
      }
    } catch (e) {
      setErro("Falha ao gerar o documento: " + (e?.message || e));
    }
    setGerando(false);
  }

  async function salvar() {
    const v = validar(true);
    if (v) { setErro(v); return; }
    setSalvando(true);
    const res = editando
      ? await atualizar(editando.id, payloadSalvar())
      : await inserir({ ...payloadSalvar(), autor: autorAtual || emailAtual || null });
    setSalvando(false);
    if (res.error) { setErro(msgErroSalvar(res.error, editando)); return; }
    if (editando) { setOk("Lançamento atualizado."); onCancelarEdicao?.(); }
    else { setOk("Registro adicionado à consolidação (Painel)."); }
    limpar();
  }

  function cancelarEdicao() {
    onCancelarEdicao?.();
    limpar();
    setErro(""); setOk("");
  }

  const emEdicao = !!editando;
  const casaSenado = ehSenado(f.cargo);
  const hintParlamentar =
    statusLista === "carregando" ? "Carregando parlamentares do RESULTADO LEXOR…"
      : statusLista === "erro" ? "Não foi possível carregar a base (dados.json). Digite manualmente."
      : lista.length ? `${lista.length} parlamentares com emenda ao Exército em ${f.ano} — selecione para autopreencher.`
      : `Nenhum parlamentar com emenda ao Exército em ${f.ano}. Escolha outro ano ou digite manualmente.`;

  return (
    <div className="view-pad">
      <h1 className="page-title">Alteração de emenda</h1>
      <p className="page-sub">
        Gere o ofício de autorização de troca/ampliação do objeto de uma emenda destinada ao
        Exército e registre a mudança na consolidação (aba <strong>Painel</strong>).
      </p>

      {emEdicao && (
        <div className="obj-edit-banner">
          <span>Editando o lançamento de <strong>{editando.parlamentar || "—"}</strong>.</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={cancelarEdicao}>
            <X size={14} /> Cancelar edição
          </button>
        </div>
      )}

      <form className="panel form" onSubmit={(e) => { e.preventDefault(); salvar(); }}>
        <div className="form-grid">
          <Field label="Tipo de ajuste" required hint="Marque um ou mais. “Mudança de Ação Orçamentária (AO)” é exclusiva (não combina com os demais).">
            <AjusteDropdown opcoes={AJUSTES} selecionados={f.ajustes} onToggle={toggleAjuste} />
          </Field>

          <Field label="Nº da emenda" required>
            <input className="input" value={f.emenda} onChange={set("emenda")} placeholder="Ex: 27590005" inputMode="numeric" />
          </Field>

          <Field label="Parlamentar" required hint={hintParlamentar}>
            <input className="input" list="parlamentares-list" value={f.parlamentar} onChange={onParlamentar}
              placeholder="Selecione ou digite o nome do parlamentar" autoComplete="off" />
            <datalist id="parlamentares-list">
              {lista.map((p) => (
                <option key={p.nome} value={p.nome}>
                  {`${p.autorTipo === "SENADOR" ? "Senado" : "Câmara"} · ${[p.partido, p.uf].filter(Boolean).join("-")}`}
                </option>
              ))}
            </datalist>
          </Field>

          <Field label="Cargo" hint={casaSenado ? "Gera o ofício no modelo do Senado. Confira o gênero." : "Confira o gênero (do/da). Preenchido pela seleção."}>
            <select className="input" value={CARGOS.includes(f.cargo) ? f.cargo : ""} onChange={set("cargo")}>
              <option value="">—</option>
              {CARGOS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>

          <Field label="Partido">
            <input className="input" list="obj-partidos-list" value={f.partido} onChange={set("partido")}
              placeholder="Ex: PL" />
            <datalist id="obj-partidos-list">
              {partidos.map((p) => <option key={p.id || p.sigla} value={p.sigla}>{p.nome}</option>)}
            </datalist>
          </Field>

          <Field label="UF">
            <select className="input" value={f.uf} onChange={set("uf")}>
              <option value="">—</option>
              {UFS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </Field>

          <Field label="Nº do ofício" hint="Deixe em branco para sair como “____/ano”.">
            <input className="input" value={f.oficioNr} onChange={set("oficioNr")} placeholder="____" />
          </Field>

          <Field label="Data do ofício" required hint="O ano também filtra os parlamentares e identifica a LOA.">
            <div className="date-row">
              <select className="input" value={f.dia} onChange={set("dia")}>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              <select className="input" value={f.mes} onChange={set("mes")}>
                {MESES_LONGO.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
              </select>
              <select className="input" value={f.ano} onChange={set("ano")}>
                {[hoje.y - 1, hoje.y, hoje.y + 1].map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </Field>

          {!ehAO && (
            <>
              <Field label="Objeto atual (DE)" hint="Como está hoje na emenda.">
                <textarea className="input textarea" rows={2} value={f.objetoDe} onChange={set("objetoDe")}
                  placeholder="Ex: Ambulância tipo “B” — Suporte básico" />
              </Field>

              <Field label="Novo objeto (PARA)" required hint="Como deverá ficar.">
                <textarea className="input textarea" rows={2} value={f.objetoPara} onChange={set("objetoPara")}
                  placeholder="Ex: Aquisição de viatura administrativa e bens…" />
              </Field>
            </>
          )}
        </div>

        {ehAO && <SecaoAO f={f} set={set} />}

        <details className="obj-rodape">
          <summary>Dados do gabinete (rodapé do ofício) — opcional</summary>
          <div className="form-grid">
            <Field label={casaSenado ? "Gabinete (Anexo/Ala/nº)" : "Gabinete (nº)"}
              hint={casaSenado ? "Ex: Anexo II - Ala Teotônio Vilela - Gabinete 19" : "Ex: 321"}>
              <input className="input" value={f.gabinete} onChange={set("gabinete")}
                placeholder={casaSenado ? "Anexo II - Ala … - Gabinete 19" : "Ex: 321"} />
            </Field>
            <Field label="Telefone"><input className="input" value={f.telefone} onChange={set("telefone")} placeholder="(61) 3215-0000" /></Field>
            <Field label="E-mail"><input className="input" value={f.email} onChange={set("email")} placeholder={casaSenado ? "sen.nome@senado.leg.br" : "dep.nome@camara.leg.br"} /></Field>
          </div>
        </details>

        {erro && <div className="alert alert-error">{erro}</div>}
        {ok && <div className="alert alert-ok">{ok}</div>}

        <div className="form-actions form-actions-2">
          <button type="button" className="btn btn-ghost" onClick={gerar} disabled={gerando}>
            <FileText size={16} /> {gerando ? "Gerando…" : ehAO ? "Gerar documento AO (.docx)" : "Gerar ofício (.docx)"}
          </button>
          <button type="submit" className="btn btn-primary" disabled={salvando}>
            <Save size={16} /> {salvando ? "Salvando…" : emEdicao ? "Atualizar lançamento" : "Salvar na consolidação"}
          </button>
        </div>
      </form>

      {itens.length > 0 && (
        <div className="panel obj-lista">
          <h2 className="panel-title">Últimos registros ({itens.length})</h2>
          <ObjetoEmendasTabela itens={itens} onEditar={onEditar} onExcluir={excluir} />
        </div>
      )}
    </div>
  );
}

// Campos específicos do documento "Mudança de Ação Orçamentária (AO)".
// Aparecem no lugar do DE/PARA de objeto quando esse tipo de ajuste é marcado.
function SecaoAO({ f, set }) {
  return (
    <div className="ao-secao">
      <h3 className="ao-secao-tit">Mudança de Ação Orçamentária (AO)</h3>
      <p className="ao-secao-sub">Campos do documento de necessidade de ajuste (AO). O documento sai com todo o texto em preto.</p>
      <div className="form-grid">
        <Field label="Objeto" required hint="Objeto da emenda (item 3 do documento).">
          <textarea className="input textarea" rows={2} value={f.aoObjeto} onChange={set("aoObjeto")}
            placeholder="Ex: Ambulância tipo “B” – Suporte básico." />
        </Field>
        <Field label="Incorreção" hint="Motivo do ajuste (item 5).">
          <textarea className="input textarea" rows={2} value={f.aoIncorrecao} onChange={set("aoIncorrecao")}
            placeholder="Ex: o valor não é suficiente para a aquisição do objeto." />
        </Field>
        <Field label="Órgão beneficiário">
          <input className="input" value={f.aoOrgaoBenef} onChange={set("aoOrgaoBenef")} placeholder="Comando do Exército" />
        </Field>
        <Field label="CNPJ">
          <input className="input" value={f.aoCnpj} onChange={set("aoCnpj")} placeholder="00.394.452/0001-03" />
        </Field>
        <Field label="OM beneficiária">
          <input className="input" value={f.aoOm} onChange={set("aoOm")} placeholder="Ex: 4º GAAAe" />
        </Field>
        <Field label="Janela" hint="Período para a alteração no SIOP (item 6).">
          <input className="input" value={f.aoJanela} onChange={set("aoJanela")} placeholder="Ex: 22 MAIO 26 a 1º JUN 26" />
        </Field>
        <Field label="Valor" hint="Valor reprogramado (usado no De e no Para).">
          <input className="input" value={f.aoValor} onChange={set("aoValor")} placeholder="Ex: R$ 1.000.000,00" />
        </Field>
      </div>

      <p className="ao-prog-tit">Programática — <strong>De</strong> <span>(situação atual)</span></p>
      <ProgLinha pref="aoDe" f={f} set={set} />
      <p className="ao-prog-tit">Programática — <strong>Para</strong> <span>(situação desejada)</span></p>
      <ProgLinha pref="aoPara" f={f} set={set} />
    </div>
  );
}

// Uma linha da classificação programática: Função / Subfunção / Programa / Ação / Subtítulo.
function ProgLinha({ pref, f, set }) {
  const campos = [["Funcao", "Função"], ["Subfuncao", "Subfunção"], ["Programa", "Programa"], ["Acao", "Ação"], ["Subtitulo", "Subtítulo"]];
  return (
    <div className="ao-prog-grid">
      {campos.map(([k, rot]) => (
        <label key={k} className="ao-prog-campo">
          <span className="ao-prog-rot">{rot}</span>
          <input className="input" value={f[pref + k]} onChange={set(pref + k)} />
        </label>
      ))}
    </div>
  );
}

// "Tipo de ajuste" como lista suspensa: recolhida ocupa uma única linha
// (mostra os ajustes selecionados); ao clicar, expande a lista com seleção
// múltipla (checkboxes). Fecha ao clicar fora.
function AjusteDropdown({ opcoes, selecionados, onToggle }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!aberto) return;
    const fora = (e) => { if (ref.current && !ref.current.contains(e.target)) setAberto(false); };
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, [aberto]);
  const rotulo = selecionados.length ? selecionados.join("; ") : "Selecione o(s) ajuste(s)…";
  return (
    <div className={`aj-drop ${aberto ? "aj-drop-aberto" : ""}`} ref={ref}>
      <button type="button" className="input aj-drop-btn" onClick={() => setAberto((a) => !a)}
        aria-haspopup="listbox" aria-expanded={aberto}>
        <span className={`aj-drop-rotulo ${selecionados.length ? "" : "aj-drop-vazio"}`}>{rotulo}</span>
        <ChevronDown size={16} className="aj-drop-seta" />
      </button>
      {aberto && (
        <div className="aj-drop-menu" role="listbox">
          {opcoes.map((a, i) => {
            const on = selecionados.includes(a);
            return (
              <button type="button" key={a} role="option" aria-selected={on}
                className={`aj-drop-item ${on ? "aj-drop-item-on" : ""}`} onClick={() => onToggle(a)}>
                {on ? <Check size={14} /> : <span className="aj-drop-num">{i + 1}</span>} {a}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
