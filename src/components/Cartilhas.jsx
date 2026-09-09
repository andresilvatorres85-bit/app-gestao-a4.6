import { useState } from "react";

// Aba Cartilhas — embute AO VIVO o "Banco de Projetos de Emendas Parlamentares"
// (repositório banco-projetos-emendas, publicado no GitHub Pages). Assim como a
// aba LOA, optou-se por embutir a versão publicada em vez de copiar o código:
// aquele projeto tem um pipeline próprio (GitHub Actions) que reconstrói o
// banco a partir do repositório de dados "cartilhas" e republica todo dia. Ao
// apontar para a versão no ar, esta aba reflete SEMPRE a última atualização do
// repositório, sem duplicar aqui o pipeline nem exigir novo deploy do Gestão
// A4.6 quando os projetos mudam. Só é preciso mexer aqui se a URL de publicação
// mudar.
//
// O parâmetro ?embed=1 pede ao site que esconda o próprio cabeçalho de título
// (redundante dentro do Gestão A4.6), preservando a barra de filtros e a lista.
// Se a versão publicada ainda não entender esse parâmetro, ela o ignora e o
// iframe continua funcionando — só aparece o título dele por dentro.
const URL_CARTILHAS = "https://andresilvatorres85-bit.github.io/banco-projetos-emendas/?embed=1";

export default function Cartilhas() {
  const [carregando, setCarregando] = useState(true);

  return (
    <div className="cartilhas-wrap">
      {carregando && (
        <div className="cartilhas-loading">Carregando Cartilhas…</div>
      )}
      <iframe
        className="cartilhas-frame"
        src={URL_CARTILHAS}
        title="Banco de Projetos de Emendas Parlamentares"
        onLoad={() => setCarregando(false)}
        allow="fullscreen"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}
