import ErrorBoundary from "../loa/components/ErrorBoundary.jsx";
import LoaApp from "../loa/LoaApp.jsx";
import "../loa/loa.css";

// Aba LOA — agora NATIVA (antes era um iframe do app publicado). O código do
// "Análise LOA" foi portado para src/loa/, com o CSS escopado sob .loa-app para
// não colidir com o estilo do Gestão A4.6. Os dados continuam vindo do
// dados.json publicado do repositório emendas-defesa-app (ver src/loa/dados.js),
// então a atualização diária do pipeline daquele repositório é preservada.
// O ErrorBoundary isola qualquer erro do módulo, sem derrubar o resto do app.
export default function Loa() {
  return (
    <ErrorBoundary>
      <LoaApp />
    </ErrorBoundary>
  );
}
