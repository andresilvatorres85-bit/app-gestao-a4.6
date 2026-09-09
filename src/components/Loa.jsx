import { useState } from "react";

// Aba LOA — embute AO VIVO o app "Análise LOA" (repositório emendas-defesa-app,
// publicado no GitHub Pages). Optou-se por embutir a versão publicada, e não por
// copiar o código, por um motivo concreto: aquele app tem um pipeline próprio
// (GitHub Actions) que relê as planilhas .xlsx e regenera os dados TODO DIA. Ao
// embutir a versão publicada, a aba LOA mostra sempre o dado mais recente sem
// precisar duplicar aqui o pipeline nem republicar o Gestão A4.6 quando a base
// muda. Só é preciso mexer aqui se a URL de publicação do app LOA mudar.
//
// O parâmetro ?embed=1 pede ao app LOA que esconda a própria faixa de título
// (redundante dentro do Gestão A4.6), preservando a navegação LEXOR/PLOA. Se a
// versão publicada ainda não entender esse parâmetro, ela simplesmente o ignora
// e o iframe continua funcionando — com o título dele à mostra.
const URL_LOA = "https://andresilvatorres85-bit.github.io/emendas-defesa-app/?embed=1";

export default function Loa() {
  const [carregando, setCarregando] = useState(true);

  return (
    <div className="loa-wrap">
      {carregando && (
        <div className="loa-loading">Carregando Análise LOA…</div>
      )}
      <iframe
        className="loa-frame"
        src={URL_LOA}
        title="Análise LOA — Ministério da Defesa"
        onLoad={() => setCarregando(false)}
        allow="fullscreen"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}
