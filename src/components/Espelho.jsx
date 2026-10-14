import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { montarEspelho, moeda, pendencias, CABECALHO } from "../lexorUtils.js";
import brasaoRepublica from "../brasao-republica.png";

// Desenha uma folha de espelho de emenda no layout do "Relatório de espelho de
// Emendas" do Lexor. Fundo branco e tipografia próprios, independentes do tema
// escuro do restante do aplicativo.
//
// Campos marcados com <Campo copiar={...}> ganham um botão de cópia que não
// aparece na impressão nem na exportação para Word.

function BotaoCopiar({ texto, titulo }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
    } catch {
      // navegadores sem permissão de área de transferência: seleção manual
      const ta = document.createElement("textarea");
      ta.value = texto;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch { /* ignora */ }
      document.body.removeChild(ta);
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1600);
  }

  return (
    <button type="button" className={`lx-copiar no-print ${copiado ? "lx-copiado" : ""}`}
      onClick={copiar} title={copiado ? "Copiado" : `Copiar ${titulo}`}>
      {copiado ? <Check size={12} /> : <Copy size={12} />}
    </button>
  );
}

// Rótulo em caixa alta + caixa cinza com o valor, como no relatório oficial.
function Campo({ rotulo, valor, copiar, largura, negrito, className = "" }) {
  return (
    <div className={`lx-campo ${className}`} style={largura ? { width: largura } : undefined}>
      {rotulo && (
        <div className="lx-rot">
          {rotulo}
          {copiar && <BotaoCopiar texto={copiar} titulo={rotulo.toLowerCase()} />}
        </div>
      )}
      <div className={`lx-valor ${negrito ? "lx-negrito" : ""}`}>{valor || "\u00A0"}</div>
    </div>
  );
}

export default function Espelho({ proposta, exercicio }) {
  const e = montarEspelho(proposta, exercicio);
  const problemas = pendencias(proposta);
  const emissao = new Date().toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  return (
    <div className="espelho-folha lx">
      {/* ---------------------------------------------------------- cabeçalho */}
      <div className="lx-topo">
        <img src={brasaoRepublica} className="lx-brasao" alt="Brasão de Armas da República Federativa do Brasil" />
        <div className="lx-topo-txt">
          <div>{CABECALHO.orgao}</div>
          <div>{CABECALHO.comissao}</div>
          <div>{CABECALHO.sistema}</div>
          <div>{CABECALHO.projeto}</div>
        </div>
        <div className="lx-aviso">{CABECALHO.aviso}</div>
      </div>
      <h1 className="lx-titulo">{CABECALHO.titulo}</h1>
      <div className="lx-regua" />

      {/* -------------------------------------------------------------- ementa */}
      <Campo rotulo="EMENTA" valor={e.ementa} copiar={e.ementa} className="lx-w100" />

      <div className="lx-row">
        <Campo rotulo="SEQUENCIAL SOF" valor={e.sequencial} copiar={e.sequencial} largura="30%" />
        <Campo rotulo="ESFERA ORÇAMENTÁRIA" valor={e.esfera} className="lx-flex" />
      </div>

      {/* ------------------------------------------- acréscimos à programação */}
      <h2 className="lx-secao">ACRÉSCIMOS À PROGRAMAÇÃO</h2>

      <div className="lx-row">
        <Campo rotulo="ÓRGÃO ORÇAMENTÁRIO" valor={e.orgao} largura="50%" />
        <Campo rotulo="UNIDADE ORÇAMENTÁRIA" valor={e.unidade} className="lx-flex" />
      </div>

      <div className="lx-fp">
        <span className="lx-fp-rot">FUNCIONAL PROGRAMÁTICA</span>
        <div className="lx-valor lx-negrito lx-fp-valor">{e.funcional}</div>
      </div>

      <div className="lx-recuo">
        <div className="lx-row">
          <Campo rotulo="FUNÇÃO" valor={e.funcao} largura="50%" />
          <Campo rotulo="SUBFUNÇÃO" valor={e.subfuncao} className="lx-flex" />
        </div>
        <Campo rotulo="PROGRAMA" valor={e.programa} className="lx-w100" />
        <Campo rotulo="AÇÃO" valor={e.acaoTexto} className="lx-w100" />
        <Campo rotulo="SUBTÍTULO" valor={e.subtitulo} className="lx-w100" />
        <Campo rotulo="DESCRIÇÃO DO SUBTÍTULO" valor={e.descricaoSubtitulo} className="lx-w100" />
      </div>

      <div className="lx-row lx-produto">
        <Campo rotulo="ESPECIFICAÇÃO DO PRODUTO / UNIDADE DE MEDIDA" valor={e.produto} className="lx-flex" />
        <Campo rotulo="META" valor={e.meta} largura="120px" />
      </div>

      {/* ------------------------------------------------------ tabela de GND */}
      <div className="lx-moeda-rot">em R$ 1,00</div>
      <table className="lx-tabela">
        <thead>
          <tr>
            <th className="lx-th-gnd" colSpan={2}>GND</th>
            <th colSpan={2}>MODALIDADE DE APLICAÇÃO</th>
            <th className="lx-th-rp">RP</th>
            <th className="lx-th-val">
              ACRÉSCIMO
              <BotaoCopiar texto={e.linhas.map(l => l.valor).join("\t")} titulo="os acréscimos" />
            </th>
          </tr>
        </thead>
        <tbody>
          {e.linhas.map(l => (
            <tr key={l.gnd}>
              <td className="lx-cod">{l.gnd}</td>
              <td>{l.gndNome}</td>
              <td className="lx-cod">90</td>
              <td>Aplicações Diretas</td>
              <td className="lx-cod">{e.rp}</td>
              <td className="lx-num">
                {moeda(l.valor)}
                <BotaoCopiar texto={String(l.valor)} titulo={`o valor do GND ${l.gnd}`} />
              </td>
            </tr>
          ))}
          {e.linhas.length === 0 && (
            <tr><td colSpan={6} className="lx-vazio">sem valores lançados na planilha</td></tr>
          )}
        </tbody>
      </table>
      <div className="lx-total"><span>TOTAL:</span><div className="lx-valor lx-negrito lx-num">{moeda(e.total)}</div></div>

      {/* -------------------------------------------- cancelamentos compensat. */}
      <h2 className="lx-secao">CANCELAMENTOS COMPENSATÓRIOS</h2>
      <div className="lx-moeda-rot">em R$ 1,00</div>
      <table className="lx-tabela">
        <thead>
          <tr>
            <th className="lx-th-seq">
              SEQUENCIAL
              <BotaoCopiar texto={e.cancelamento.sequencial} titulo="o sequencial do cancelamento" />
            </th>
            <th className="lx-th-fonte">FONTE</th>
            <th className="lx-th-gnd" colSpan={2}>GND</th>
            <th colSpan={2}>MODALIDADE DE APLICAÇÃO</th>
            <th className="lx-th-id">ID</th>
            <th className="lx-th-rp">RP</th>
            <th className="lx-th-val">CANCELAMENTO</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="lx-cod">{e.cancelamento.sequencial}</td>
            <td className="lx-cod">{e.cancelamento.fonte}</td>
            <td className="lx-cod">{e.cancelamento.gnd}</td>
            <td>{e.cancelamento.gndNome}</td>
            <td className="lx-cod">{e.cancelamento.modalidade}</td>
            <td>{e.cancelamento.modalidadeNome}</td>
            <td className="lx-cod">{e.cancelamento.id}</td>
            <td className="lx-cod">{e.cancelamento.rp}</td>
            <td className="lx-num">
              {moeda(e.cancelamento.valor)}
              <BotaoCopiar texto={String(e.cancelamento.valor)} titulo="o valor do cancelamento" />
            </td>
          </tr>
        </tbody>
      </table>
      <div className="lx-total"><span>TOTAL:</span><div className="lx-valor lx-negrito lx-num">{moeda(e.total)}</div></div>

      {/* ------------------------------------------------------- justificativa */}
      <h2 className="lx-secao">
        JUSTIFICATIVA
        <BotaoCopiar texto={e.justificativa} titulo="a justificativa" />
      </h2>
      <div className="lx-valor lx-just">{e.justificativa}</div>

      <div className="lx-row lx-autor-row">
        <Campo rotulo="AUTOR" valor={e.autor || "a definir"} copiar={e.autor} className="lx-flex" />
      </div>
      <div className="lx-row">
        <Campo rotulo="Nº PROPOSTA" valor={e.nrProposta || "—"} copiar={e.nrProposta} className="lx-flex" />
      </div>

      {/* -------------------------------------------------------------- rodapé */}
      <div className="lx-rodape">
        <span>Emissão: {emissao}</span>
        <span className="lx-pagina">Página 1 de 1</span>
      </div>

      {problemas.length > 0 && (
        <div className="esp-pendencias no-print">
          <strong>Pendências para exportação:</strong> {problemas.join(" · ")}
        </div>
      )}
    </div>
  );
}
