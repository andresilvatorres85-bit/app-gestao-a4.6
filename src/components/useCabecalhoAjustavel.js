import { useLayoutEffect } from "react";

// Ajusta o cabeçalho à largura disponível para que TODOS os botões fiquem
// visíveis. Em vez de pontos de quebra fixos (a largura dos botões muda com a
// fonte e o zoom de cada máquina), mede de fato: se algum botão sai da tela,
// aplica o modo compacto; se ainda não couber, o de duas linhas (marca +
// Tour/Sair em cima, módulos numa grade embaixo). No celular (≤ 640 px) vale o
// layout empilhado definido no CSS.
const MODOS = ["tb-compacta", "tb-duas-linhas"];

function transborda(h) {
  if (h.scrollWidth > h.clientWidth + 1) return true;
  const limite = h.getBoundingClientRect().right - 2;
  return [...h.querySelectorAll("button")].some((b) => {
    const r = b.getBoundingClientRect();
    return r.right > limite || b.scrollWidth > b.clientWidth + 1;
  });
}

export function useCabecalhoAjustavel(ref, deps = []) {
  useLayoutEffect(() => {
    const h = ref.current;
    if (!h) return undefined;
    let raf = 0;
    const ajustar = () => {
      h.classList.remove(...MODOS);
      if (window.innerWidth <= 640) return;
      for (const modo of MODOS) {
        if (!transborda(h)) return;
        h.classList.add(modo);
      }
    };
    const agendar = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(ajustar); };
    ajustar();
    window.addEventListener("resize", agendar);
    document.fonts?.ready?.then(ajustar);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", agendar); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
