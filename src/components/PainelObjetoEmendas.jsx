import { useRef, useState } from "react";
import { FileDown, Image as ImageIcon } from "lucide-react";
import ObjetoEmendasTabela from "./ObjetoEmendasTabela.jsx";
import { exportarAlteracoesPptx, exportarGraficoPng } from "../exportUtils.js";

// Card de consolidação no rodapé do "Painel". Mesma estrutura do card "Últimos
// registros" da aba "Objeto Emenda" (tabela com edição/exclusão/reemissão),
// com os botões PPTX e PNG dos gráficos do Painel. As duas exportações levam
// o que está na tabela (respeitando o filtro de Tipo de ajuste).
export default function PainelObjetoEmendas({ itens = [], onEditar, onExcluir }) {
  const ref = useRef(null);
  const [ocupado, setOcupado] = useState(false);
  const [visiveis, setVisiveis] = useState(itens);

  async function executar(fn, rotulo) {
    setOcupado(true);
    try {
      await fn();
    } catch (e) {
      console.error(`Falha ao exportar ${rotulo}:`, e);
    }
    setOcupado(false);
  }

  return (
    <div className="panel obj-lista" ref={ref}>
      <div className="panel-title-row">
        <h2 className="panel-title">Alterações em emendas parlamentares</h2>
        <div className="chart-actions no-export">
          <button className="mini-btn" disabled={ocupado}
            onClick={() => executar(() => exportarAlteracoesPptx(itens.length ? visiveis : []), "PPTX")}
            title="Exportar as alterações em PowerPoint (6 por slide)">
            <FileDown size={13} /> PPTX
          </button>
          <button className="mini-btn" disabled={ocupado || itens.length === 0}
            onClick={() => executar(() => exportarGraficoPng(ref.current, "Alteracoes_em_emendas_parlamentares"), "PNG")}
            title="Exportar esta tabela como imagem PNG">
            <ImageIcon size={13} /> PNG
          </button>
        </div>
      </div>
      {itens.length === 0 ? (
        <p className="oe-vazio">
          Nenhuma alteração registrada. Use o botão <strong>Alteração emenda</strong> para gerar o
          ofício e adicionar a mudança aqui.
        </p>
      ) : (
        <ObjetoEmendasTabela itens={itens} onEditar={onEditar} onExcluir={onExcluir} onVisiveis={setVisiveis} />
      )}
    </div>
  );
}
