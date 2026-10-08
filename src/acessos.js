// Controle de acesso por usuário aos módulos, abas e subabas do aplicativo.
//
// Cada item do CATALOGO tem uma chave hierárquica ("loa", "loa.ploa",
// "loa.ploa.ploa-dashboard"). Na tabela `usuarios`, a coluna `bloqueios` guarda
// as chaves retiradas daquele usuário; bloquear um item bloqueia tudo abaixo
// dele. Itens novos nascem liberados. Administradores (`admin = true`) têm
// acesso a tudo e gerenciam os acessos em CONFIGURAÇÕES › Geral › Acessos.
import { createContext, useContext } from "react";
import { SECOES } from "./loa/secoes.js";

const folhas = (pares) => pares.map(([id, rotulo]) => ({ id, rotulo }));

export const CATALOGO = [
  { id: "calendario", rotulo: "CALENDÁRIO", filhos: folhas([
    ["agenda", "Agenda"], ["pendencias", "PENDÊNCIAS"], ["briefing", "ASSUNTOS BRIEFING"],
  ]) },
  { id: "metricas", rotulo: "MÉTRICAS", filhos: folhas([
    ["dashboard", "Painel"], ["novo", "Lançar"], ["objeto", "Alteração emenda"], ["historico", "Histórico"],
  ]) },
  { id: "lexor", rotulo: "LEXOR" },
  { id: "loa", rotulo: "LOA", filhos: SECOES.map((s) => ({
    id: s.id, rotulo: s.rotulo, filhos: s.subabas.map((a) => ({ id: a.id, rotulo: a.rotulo })),
  })) },
  { id: "proposicoes", rotulo: "Proposições" },
  { id: "cartilhas", rotulo: "Cartilhas" },
  { id: "conhecimento", rotulo: "CONHECIMENTO", filhos: folhas([
    ["legislacao", "Legislação"], ["recebimento", "Recebimento Função"], ["rotina", "Rotina Asse Orç"], ["contatos", "Contatos"],
  ]) },
  { id: "config", rotulo: "CONFIGURAÇÕES", filhos: [
    { id: "geral", rotulo: "Geral", filhos: folhas([["usuarios", "Usuários"]]) },
    { id: "metricas", rotulo: "MÉTRICAS", filhos: folhas([["partidos", "Partidos e espectro"]]) },
    { id: "loa", rotulo: "LOA", filhos: folhas([["estrategia", "Estratégia · listas e selos"]]) },
  ] },
];

// Lista plana { chave, rotulo, nivel, pai } na ordem da árvore.
export function itensDoCatalogo() {
  const out = [];
  const visitar = (nos, pai, nivel) => nos.forEach((n) => {
    const chave = pai ? `${pai}.${n.id}` : n.id;
    out.push({ chave, rotulo: n.rotulo, nivel, pai, temFilhos: !!n.filhos?.length });
    if (n.filhos) visitar(n.filhos, chave, nivel + 1);
  });
  visitar(CATALOGO, null, 0);
  return out;
}

// O item está liberado e, se tiver filhos, ao menos um deles também está
// (um módulo com todas as abas retiradas some do cabeçalho).
export function temAcesso(pode, chave) {
  if (!pode(chave)) return false;
  const no = chave.split(".").reduce((nos, id) => (nos?.filhos ?? nos)?.find?.((n) => n.id === id), { filhos: CATALOGO });
  if (!no?.filhos?.length) return true;
  return no.filhos.some((f) => temAcesso(pode, `${chave}.${f.id}`));
}

const prefixos = (chave) => chave.split(".").map((_, i, a) => a.slice(0, i + 1).join("."));

export const bloqueado = (bloqueios, chave) => {
  const set = bloqueios instanceof Set ? bloqueios : new Set(bloqueios || []);
  return prefixos(chave).some((k) => set.has(k));
};

// Remove chaves redundantes (já cobertas por um ancestral bloqueado).
export const normalizar = (lista) => {
  const set = new Set(lista);
  return [...set].filter((k) => !prefixos(k).slice(0, -1).some((p) => set.has(p))).sort();
};

const mesmoEmail = (a, b) => !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();

// Situação de acesso do usuário logado.
//  - sem nenhum administrador definido: acesso livre (comportamento anterior);
//  - administrador: acesso total;
//  - e-mail não cadastrado em Usuários: sem acesso;
//  - demais: tudo, menos os bloqueios.
export function calcularAcesso(usuarios, email) {
  const haAdmin = usuarios.some((u) => u.admin === true);
  const eu = usuarios.find((u) => mesmoEmail(u.email, email)) || null;
  if (!haAdmin) return { haAdmin, ehAdmin: false, eu, semCadastro: false, pode: () => true };
  if (eu?.admin) return { haAdmin, ehAdmin: true, eu, semCadastro: false, pode: () => true };
  if (!eu) return { haAdmin, ehAdmin: false, eu, semCadastro: true, pode: () => false };
  const set = new Set(Array.isArray(eu.bloqueios) ? eu.bloqueios : []);
  return { haAdmin, ehAdmin: false, eu, semCadastro: false, pode: (chave) => !bloqueado(set, chave) };
}

const LIVRE = { haAdmin: false, ehAdmin: false, eu: null, semCadastro: false, pode: () => true };
export const AcessoContext = createContext(LIVRE);
export const useAcesso = () => useContext(AcessoContext);
