import ObjetoEmendasTabela from "./ObjetoEmendasTabela.jsx";

// Card de consolidação no rodapé do "Painel". Mesma estrutura do card "Últimos
// registros" da aba "Objeto Emenda" (tabela com edição/exclusão/reemissão).
export default function PainelObjetoEmendas({ itens = [], onEditar, onExcluir }) {
  return (
    <div className="panel obj-lista">
      <h2 className="panel-title">Alterações em emendas parlamentares</h2>
      {itens.length === 0 ? (
        <p className="oe-vazio">
          Nenhuma alteração registrada. Use o botão <strong>Objeto Emenda</strong> para gerar o
          ofício e adicionar a mudança aqui.
        </p>
      ) : (
        <ObjetoEmendasTabela itens={itens} onEditar={onEditar} onExcluir={onExcluir} />
      )}
    </div>
  );
}
