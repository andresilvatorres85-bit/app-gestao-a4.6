import { useMemo, useState } from 'react'
import {
  gerarDocumento, indicePorUFCasa, montarConfig,
} from '../estrategia.js'
import {
  baixarDocx, baixarPdf, baixarZip,
} from '../estrategiaDoc.js'
import {
  UFS, UF_NOME, CASAS, LIMITACOES,
  REMOVIDOS_MANDATO, WHITELIST_SEN_ATIVOS, NAO_REELEITOS,
  CARGOS_2027,
} from '../estrategiaConfig.js'

const CH = '#'
const cor = (h) => CH + h

// Persistência local das listas de mandato editáveis (ESPEC §4/§13).
const LS_KEY = 'estrategia.config.v1'
const carregarConfigLocal = () => {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch { return null }
}
// Sobrescritas salvas → montarConfig. Listas ausentes (config salva antes de
// existirem) ficam com o padrão.
const overDe = (c) => (c ? {
  removidos: c.removidos, whitelist: c.whitelist, naoReeleitos: c.naoReeleitos, cargos2027: c.cargos2027,
} : {})
// "NOME = CARGO" por linha ⇄ objeto { NOME: CARGO }.
const cargosParaTexto = (o) => Object.entries(o).map(([n, c]) => `${n} = ${c}`).join('\n')
const cargosDeTexto = (t) => Object.fromEntries(t.split('\n').map((l) => l.split('='))
  .filter((p) => p.length === 2 && p[0].trim() && p[1].trim())
  .map(([n, c]) => [n.trim().toUpperCase(), c.trim().toUpperCase()]))
const listaDeTexto = (t) =>
  t.split('\n').map((s) => s.trim().toUpperCase()).filter(Boolean)

export default function AbaEstrategia({ registros }) {
  const [uf, setUf] = useState('RJ')
  const [casa, setCasa] = useState('camara')
  const [cfgLocal, setCfgLocal] = useState(() => carregarConfigLocal())
  const [editandoCfg, setEditandoCfg] = useState(false)
  const [txtRemov, setTxtRemov] = useState(
    (cfgLocal?.removidos ?? REMOVIDOS_MANDATO).join('\n'))
  const [txtWhite, setTxtWhite] = useState(
    (cfgLocal?.whitelist ?? WHITELIST_SEN_ATIVOS).join('\n'))
  const [txtNaoReel, setTxtNaoReel] = useState(
    (cfgLocal?.naoReeleitos ?? NAO_REELEITOS).join('\n'))
  const [txtCargos, setTxtCargos] = useState(
    cargosParaTexto(cfgLocal?.cargos2027 ?? CARGOS_2027))
  const [progresso, setProgresso] = useState(null) // {feito,total,formato} | null

  const config = useMemo(
    () => montarConfig(overDe(cfgLocal)),
    [cfgLocal])

  const indice = useMemo(() => indicePorUFCasa(registros, config), [registros, config])
  const documento = useMemo(
    () => gerarDocumento(registros, { uf, casa, config }), [registros, uf, casa, config])

  // Se a UF atual ficou sem dados na Casa escolhida, mantém a seleção (mostra o
  // estado vazio) — o usuário escolheu de propósito.
  const contUF = (u, c) => indice[c]?.[u]?.total ?? 0
  const totalCasa = (c) => UFS.reduce((s, u) => s + contUF(u, c), 0)

  const salvarCfg = () => {
    const novo = { removidos: listaDeTexto(txtRemov), whitelist: listaDeTexto(txtWhite), naoReeleitos: listaDeTexto(txtNaoReel), cargos2027: cargosDeTexto(txtCargos) }
    try { localStorage.setItem(LS_KEY, JSON.stringify(novo)) } catch { /* modo privado */ }
    setCfgLocal(novo)
    setEditandoCfg(false)
  }
  const restaurarCfg = () => {
    try { localStorage.removeItem(LS_KEY) } catch { /* ignore */ }
    setCfgLocal(null)
    setTxtRemov(REMOVIDOS_MANDATO.join('\n'))
    setTxtWhite(WHITELIST_SEN_ATIVOS.join('\n'))
    setTxtNaoReel(NAO_REELEITOS.join('\n'))
    setTxtCargos(cargosParaTexto(CARGOS_2027))
    setEditandoCfg(false)
  }

  const baixarPacote = async (formato) => {
    if (progresso) return
    setProgresso({ feito: 0, total: 54, formato })
    try {
      await baixarZip(registros, {
        formato,
        configOver: overDe(cfgLocal),
        onProgresso: (feito, total) => setProgresso({ feito, total, formato }),
      })
    } catch (e) {
      console.error('Falha ao gerar o pacote:', e)
      alert('Não foi possível gerar o pacote: ' + (e?.message || e))
    } finally {
      setProgresso(null)
    }
  }

  return (
    <section className="estrategia" aria-label="Estratégia de captação de emendas">
      {/* ---- controles ---- */}
      <div className="estr-controles">
        <div className="estr-casa" role="tablist" aria-label="Casa legislativa">
          {Object.values(CASAS).map((c) => (
            <button
              key={c.id}
              role="tab"
              aria-selected={casa === c.id}
              className={`estr-casa-btn${casa === c.id ? ' ativa' : ''}`}
              style={casa === c.id ? { background: cor(c.corSubtitulo), borderColor: cor(c.corSubtitulo) } : undefined}
              onClick={() => setCasa(c.id)}
            >
              {c.rotulo}
              <span className="estr-casa-n">{totalCasa(c.id)}</span>
            </button>
          ))}
        </div>

        <label className="estr-uf-label">
          Estado
          <select className="estr-uf" value={uf} onChange={(e) => setUf(e.target.value)}>
            {UFS.map((u) => (
              <option key={u} value={u}>
                {UF_NOME[u]} ({u}) — {contUF(u, casa)} parlamentar(es)
              </option>
            ))}
          </select>
        </label>

        <div className="estr-export">
          <button className="btn-docx" onClick={() => baixarDocx(documento)} title="Baixar este documento em DOCX (Word)">
            DOCX
          </button>
          <button className="btn-pdf" onClick={() => baixarPdf(documento)} title="Baixar este documento em PDF">
            PDF
          </button>
          <button
            className="btn-pptx"
            disabled={!!progresso}
            onClick={() => baixarPacote('docx')}
            title="Baixar os 54 documentos (27 UF × 2 Casas) em DOCX, zipados por Casa"
          >
            {progresso?.formato === 'docx' ? `DOCX ${progresso.feito}/${progresso.total}…` : 'Pacote DOCX'}
          </button>
          <button
            className="btn-pptx"
            disabled={!!progresso}
            onClick={() => baixarPacote('pdf')}
            title="Baixar os 54 documentos (27 UF × 2 Casas) em PDF, zipados por Casa"
          >
            {progresso?.formato === 'pdf' ? `PDF ${progresso.feito}/${progresso.total}…` : 'Pacote PDF'}
          </button>
        </div>
      </div>

      {progresso && (
        <div className="estr-progresso" role="status">
          <div className="estr-progresso-barra" style={{ width: `${(progresso.feito / progresso.total) * 100}%` }} />
          <span>Gerando pacote {progresso.formato.toUpperCase()} — {progresso.feito} de {progresso.total} documentos…</span>
        </div>
      )}

      {/* ---- prévia do documento (espelha o DOCX/PDF exportado) ---- */}
      <article className="estr-doc" aria-label="Prévia do documento">
        <h1 className="estr-titulo" style={{ color: cor('1A3A5C') }}>{documento.titulo}</h1>
        <h2 className="estr-subtitulo" style={{ color: cor(documento.corSubtitulo), borderColor: cor('1A3A5C') }}>
          {documento.subtitulo}
        </h2>

        <p className="estr-meta">{documento.meta}</p>

        <div className="estr-tutorial">
          <p className="estr-tutorial-tit" style={{ color: cor('1A3A5C') }}>{documento.tutorialTitulo}</p>
          {documento.tutorialItens.map((c) => (
            <p key={c.tutulo} className="estr-tutorial-item">
              <strong style={{ color: cor(c.cor) }}>● {c.tutulo} </strong>
              — {c.texto}
            </p>
          ))}
          <p className="estr-selos"><strong style={{ color: cor('1A3A5C') }}>Selos: </strong>{documento.selosLegenda}</p>
        </div>

        <p className="estr-disclaimer" style={{ background: cor('F2ECDD') }}>
          <strong style={{ color: cor('B56A00') }}>Disclaimer: </strong>{documento.disclaimer}
        </p>

        {documento.vazio ? (
          <p className="estr-vazio">{documento.textoVazio}</p>
        ) : (
          documento.secoes.map((s) => (
            <section key={s.id} className="estr-secao">
              <h3 className="estr-secao-cab" style={{ background: cor(s.cor) }}>{s.cabecalho}</h3>
              {s.fichas.map((f) => (
                <div key={f.autor} className="estr-ficha" style={{ borderColor: cor(s.cor) }}>
                  <p className="estr-ficha-nome" style={{ color: cor(s.cor) }}>
                    {f.nome}
                    {f.selos.map((sel) => {
                      // selos das eleições: preenchidos na cor própria
                      const d = (f.destaques || []).find((x) => x.texto === sel)
                      return (
                        <span key={sel} className="estr-selo"
                          style={d
                            ? { background: cor(d.cor), borderColor: cor(d.cor), color: '#fff' }
                            : { borderColor: cor(s.cor), color: cor(s.cor) }}>{sel}</span>
                      )
                    })}
                  </p>
                  <p className="estr-ficha-ident">{f.ident}</p>
                  {f.campos.map((c) => (
                    <p key={c.rotulo} className="estr-campo">
                      <strong style={{ color: cor(s.cor) }}>{c.rotulo}: </strong>{c.texto}
                    </p>
                  ))}
                </div>
              ))}
            </section>
          ))
        )}

        <p className="estr-nota" style={{ borderColor: cor('1A3A5C'), color: cor('1A3A5C') }}>
          <strong>Nota: </strong>{documento.notaFechamento}
        </p>
      </article>

      {/* ---- configuração das listas de mandato (ESPEC §4) ---- */}
      <details className="estr-cfg" open={editandoCfg} onToggle={(e) => setEditandoCfg(e.target.open)}>
        <summary>Configuração das listas de mandato ativo (2026){cfgLocal ? ' · personalizada' : ''}</summary>
        <div className="estr-cfg-corpo">
          <p className="estr-cfg-ajuda">
            Um nome por linha, em CAIXA ALTA, como aparece no campo Autor. Salvo neste navegador.
          </p>
          <div className="estr-cfg-grid">
            <label>
              Removidos do mandato (aparecem em 2024–2026, mas não estão mais em exercício)
              <textarea rows={6} value={txtRemov} onChange={(e) => setTxtRemov(e.target.value)} />
            </label>
            <label>
              Whitelist de senadores ativos (em exercício, sem emenda recente à Defesa)
              <textarea rows={6} value={txtWhite} onChange={(e) => setTxtWhite(e.target.value)} />
            </label>
            <label>
              Não reeleitos nas eleições de 2026 (recebem o selo vermelho NÃO REELEITO)
              <textarea rows={6} value={txtNaoReel} onChange={(e) => setTxtNaoReel(e.target.value)} />
            </label>
            <label>
              Cargo em 2027 para quem muda de cargo (NOME = CARGO, um por linha)
              <textarea rows={6} value={txtCargos} onChange={(e) => setTxtCargos(e.target.value)} />
            </label>
          </div>
          <div className="estr-cfg-acoes">
            <button className="btn-docx" onClick={salvarCfg}>Salvar</button>
            <button className="limpar-tudo" onClick={restaurarCfg}>Restaurar padrão</button>
          </div>
        </div>
      </details>

      {/* ---- limitações conhecidas (ESPEC §14) ---- */}
      <details className="estr-limit">
        <summary>Limitações conhecidas deste módulo</summary>
        <ul>{LIMITACOES.map((l, i) => <li key={i}>{l}</li>)}</ul>
      </details>
    </section>
  )
}
