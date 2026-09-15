import { resumoObjeto } from "../objetoEmendaDoc.js";

// Tabela de consolidação das retificações de objeto de emenda, no rodapé do
// Painel. Segue o modelo do documento de referência: cabeçalho verde e linhas
// claras, com as colunas Parlamentar · Partido · Objeto · Ajustes.
export default function PainelObjetoEmendas({ itens = [] }) {
  return (
    <section className="oe-card" aria-label="Consolidação de objeto de emendas">
      <div className="oe-card-head">
        <h2 className="panel-title">Objeto de emendas — consolidação</h2>
        <span className="oe-count">{itens.length} registro(s)</span>
      </div>

      {itens.length === 0 ? (
        <p className="oe-vazio">
          Nenhuma retificação registrada. Use o botão <strong>Objeto Emenda</strong> para gerar o
          ofício e adicionar a mudança aqui.
        </p>
      ) : (
        <div className="table-wrap">
          <table className="oe-tabela">
            <thead>
              <tr>
                <th className="oe-th-parl">Parlamentar</th>
                <th className="oe-th-part">Partido</th>
                <th className="oe-th-obj">Objeto</th>
                <th className="oe-th-aj">Ajustes</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((it) => (
                <tr key={it.id}>
                  <td className="oe-c-parl">{it.parlamentar || "—"}</td>
                  <td className="oe-c-part">{[it.partido, it.uf].filter(Boolean).join("/") || "—"}</td>
                  <td className="oe-c-obj">{resumoObjeto(it)}</td>
                  <td className="oe-c-aj">{it.ajuste || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
