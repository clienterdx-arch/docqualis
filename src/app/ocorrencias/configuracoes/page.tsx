"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle, ArrowLeft, CheckCircle2, FileText, FileWarning,
  GripVertical, HeartHandshake, MessageSquare, Plus,
  QrCode, Save, Settings, ShieldCheck, Trash2, X,
  ClipboardList, Wrench, ToggleLeft, ToggleRight, ChevronDown,
} from "lucide-react";

// ─── TYPES ───────────────────────────────────────────────────────────────────

type TipoCampo = "TEXTO" | "TEXTO_LONGO" | "DATA" | "HORA" | "SELECAO" | "MULTIPLA_ESCOLHA" | "NUMERO" | "IMAGEM" | "ASSINATURA" | "ARQUIVO";

interface Campo {
  id: string;
  label: string;
  tipo: TipoCampo;
  obrigatorio: boolean;
  opcoes: string[];
}

interface TemplateRegistro {
  campos: Campo[];
}

interface TemplateTriagem {
  campos: Campo[];
}

interface TemplateTratativa {
  usarIshikawa: boolean;
  usar5Porques: boolean;
  usarPlanoAcao: boolean;
  usarComentarios: boolean;
}

interface Prefixos {
  NI: string; NC: string; EL: string; RC: string; MF: string;
  digitos: number;
}

type Aba =
  | "template-ni" | "template-nc" | "template-ouvidoria"
  | "triagem" | "tratativa" | "geral";

// ─── CONSTANTES ───────────────────────────────────────────────────────────────

const TIPOS_CAMPO: { tipo: TipoCampo; label: string; descricao: string }[] = [
  { tipo: "TEXTO",           label: "Texto curto",      descricao: "Uma linha de texto livre" },
  { tipo: "TEXTO_LONGO",     label: "Texto longo",      descricao: "Parágrafo, narração, descrição" },
  { tipo: "DATA",            label: "Data",             descricao: "Seletor de data (calendário)" },
  { tipo: "HORA",            label: "Hora",             descricao: "Seletor de horário" },
  { tipo: "NUMERO",          label: "Número",           descricao: "Valor numérico ou escala" },
  { tipo: "SELECAO",         label: "Seleção única",    descricao: "Dropdown com opções pré-definidas" },
  { tipo: "MULTIPLA_ESCOLHA",label: "Múltipla escolha", descricao: "Checkboxes com opções livres" },
  { tipo: "IMAGEM",          label: "Imagem / Foto",    descricao: "Captura ou upload de imagem" },
  { tipo: "ARQUIVO",         label: "Arquivo",          descricao: "Upload de documento ou PDF" },
  { tipo: "ASSINATURA",      label: "Assinatura",       descricao: "Campo para assinatura eletrônica" },
];

function genId() { return `f-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`; }

const campoPadrao = (label = "", tipo: TipoCampo = "TEXTO"): Campo => ({
  id: genId(), label, tipo, obrigatorio: false, opcoes: [],
});

// ─── ESTADO INICIAL ───────────────────────────────────────────────────────────

const TEMPLATE_NI_INICIAL: TemplateRegistro = {
  campos: [
    campoPadrao("Data e hora do incidente", "DATA"),
    campoPadrao("Descrição do incidente", "TEXTO_LONGO"),
    campoPadrao("Local onde ocorreu", "TEXTO"),
    campoPadrao("Tipo de incidente", "SELECAO"),
    campoPadrao("Envolveu paciente?", "SELECAO"),
    campoPadrao("Ação imediata tomada", "TEXTO_LONGO"),
    campoPadrao("Evidências / Fotos", "IMAGEM"),
  ],
};

const TEMPLATE_NC_INICIAL: TemplateRegistro = {
  campos: [
    campoPadrao("Data de identificação", "DATA"),
    campoPadrao("Descrição da não conformidade", "TEXTO_LONGO"),
    campoPadrao("Referência do requisito / POP / Norma", "TEXTO"),
    campoPadrao("Classificação", "SELECAO"),
    campoPadrao("Frequência de ocorrência", "SELECAO"),
    campoPadrao("Evidências / Documentos", "ARQUIVO"),
  ],
};

const TEMPLATE_OUV_INICIAL: TemplateRegistro = {
  campos: [
    campoPadrao("Classificação", "SELECAO"),
    campoPadrao("Relato do usuário / paciente", "TEXTO_LONGO"),
    campoPadrao("Data do ocorrido", "DATA"),
    campoPadrao("Setor envolvido", "TEXTO"),
    campoPadrao("Deseja ser contatado?", "SELECAO"),
    campoPadrao("Contato (caso não anônimo)", "TEXTO"),
  ],
};

const TEMPLATE_TRIAGEM_INICIAL: TemplateTriagem = {
  campos: [
    campoPadrao("Avaliação de gravidade", "SELECAO"),
    campoPadrao("Classificação do risco", "SELECAO"),
    campoPadrao("Requer ação imediata?", "SELECAO"),
    campoPadrao("Observações da triagem", "TEXTO_LONGO"),
  ],
};

const TEMPLATE_TRATATIVA_INICIAL: TemplateTratativa = {
  usarIshikawa: true,
  usar5Porques: true,
  usarPlanoAcao: true,
  usarComentarios: true,
};

const PREFIXOS_INICIAL: Prefixos = {
  NI: "NI", NC: "NC", EL: "EL", RC: "RC", MF: "MF", digitos: 4,
};

// ─── COMPONENTES BASE ─────────────────────────────────────────────────────────

const INPUT_CLS = "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-[#2655e8] focus:bg-white outline-none transition-colors";
const SELECT_CLS = "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-[#2655e8] outline-none transition-colors";

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function Toggle({ ativo, onChange, label, descricao }: { ativo: boolean; onChange: (v: boolean) => void; label: string; descricao?: string }) {
  return (
    <div className="flex items-center justify-between py-3 px-4 bg-white border border-slate-200 rounded-xl">
      <div>
        <p className="text-sm font-bold text-slate-800">{label}</p>
        {descricao && <p className="text-xs text-slate-400 mt-0.5">{descricao}</p>}
      </div>
      <button onClick={() => onChange(!ativo)} className={`relative w-11 h-6 rounded-full transition-colors ${ativo ? "bg-[#2655e8]" : "bg-slate-200"}`}>
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${ativo ? "translate-x-5" : "translate-x-0"}`} />
      </button>
    </div>
  );
}

// ─── EDITOR DE CAMPO ──────────────────────────────────────────────────────────

function EditorCampo({
  campo, onChange, onRemover, index, total,
}: {
  campo: Campo;
  onChange: (c: Campo) => void;
  onRemover: () => void;
  index: number;
  total: number;
}) {
  const [expandido, setExpandido] = useState(false);
  const [novaOpcao, setNovaOpcao] = useState("");

  const temOpcoes = campo.tipo === "SELECAO" || campo.tipo === "MULTIPLA_ESCOLHA";

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      <div className="flex items-center gap-3 px-4 py-3">
        <GripVertical className="w-4 h-4 text-slate-300 shrink-0 cursor-grab" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <input
              value={campo.label}
              onChange={(e) => onChange({ ...campo, label: e.target.value })}
              className="flex-1 text-sm font-bold text-slate-800 bg-transparent border-none outline-none placeholder:text-slate-300"
              placeholder="Nome do campo..."
            />
            <select
              value={campo.tipo}
              onChange={(e) => onChange({ ...campo, tipo: e.target.value as TipoCampo, opcoes: [] })}
              className="text-xs font-bold text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 outline-none focus:border-[#2655e8]"
            >
              {TIPOS_CAMPO.map((t) => (
                <option key={t.tipo} value={t.tipo}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 cursor-pointer">
            <input
              type="checkbox"
              checked={campo.obrigatorio}
              onChange={(e) => onChange({ ...campo, obrigatorio: e.target.checked })}
              className="w-3.5 h-3.5 accent-[#2655e8]"
            />
            Obrig.
          </label>
          {temOpcoes && (
            <button onClick={() => setExpandido(!expandido)} className="p-1.5 text-slate-400 hover:text-[#2655e8] hover:bg-[#eef2ff] rounded-lg transition-colors">
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expandido ? "rotate-180" : ""}`} />
            </button>
          )}
          <button onClick={onRemover} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Opções (para SELECAO e MULTIPLA_ESCOLHA) */}
      {temOpcoes && expandido && (
        <div className="px-4 pb-4 border-t border-slate-100 pt-3">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Opções</p>
          <div className="space-y-1.5 mb-3">
            {campo.opcoes.map((op, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
                <input
                  value={op}
                  onChange={(e) => {
                    const novas = [...campo.opcoes];
                    novas[i] = e.target.value;
                    onChange({ ...campo, opcoes: novas });
                  }}
                  className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:border-[#2655e8]"
                />
                <button onClick={() => onChange({ ...campo, opcoes: campo.opcoes.filter((_, j) => j !== i) })} className="p-1 text-slate-300 hover:text-red-400 rounded">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={novaOpcao}
              onChange={(e) => setNovaOpcao(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && novaOpcao.trim()) {
                  onChange({ ...campo, opcoes: [...campo.opcoes, novaOpcao.trim()] });
                  setNovaOpcao("");
                }
              }}
              className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:border-[#2655e8]"
              placeholder="Digite uma opção e pressione Enter..."
            />
            <button
              onClick={() => { if (novaOpcao.trim()) { onChange({ ...campo, opcoes: [...campo.opcoes, novaOpcao.trim()] }); setNovaOpcao(""); } }}
              className="px-3 py-1.5 bg-[#eef2ff] text-[#2655e8] text-xs font-bold rounded-lg hover:bg-[#e0e7ff] transition-colors"
            >
              + Add
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── FORM BUILDER ─────────────────────────────────────────────────────────────

function FormBuilder({
  titulo, descricao, template, onChange,
}: {
  titulo: string;
  descricao: string;
  template: TemplateRegistro;
  onChange: (t: TemplateRegistro) => void;
}) {
  const [tipoCampoNovo, setTipoCampoNovo] = useState<TipoCampo>("TEXTO");

  function adicionarCampo() {
    const novo = campoPadrao("", tipoCampoNovo);
    onChange({ ...template, campos: [...template.campos, novo] });
  }

  function atualizarCampo(id: string, campo: Campo) {
    onChange({ ...template, campos: template.campos.map((c) => c.id === id ? campo : c) });
  }

  function removerCampo(id: string) {
    onChange({ ...template, campos: template.campos.filter((c) => c.id !== id) });
  }

  return (
    <div className="flex flex-col h-full animate-in fade-in">
      {/* Info do template */}
      <div className="mb-6 p-5 bg-slate-50 border border-slate-200 rounded-2xl">
        <h3 className="text-base font-black text-slate-900 mb-0.5">{titulo}</h3>
        <p className="text-sm text-slate-500">{descricao}</p>
        <p className="text-xs text-slate-400 mt-2">
          Configure os campos que aparecerão no formulário de notificação. Os campos padrão (código, data de registro, setor, notificador) são automáticos e não precisam ser adicionados.
        </p>
      </div>

      {/* Campos */}
      <div className="flex-1 overflow-y-auto space-y-2.5 custom-scrollbar pr-1 mb-4">
        {template.campos.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
            <ClipboardList className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm font-medium">Nenhum campo adicionado.</p>
            <p className="text-xs mt-1">Use o painel abaixo para adicionar campos.</p>
          </div>
        )}
        {template.campos.map((campo, i) => (
          <EditorCampo
            key={campo.id}
            campo={campo}
            index={i}
            total={template.campos.length}
            onChange={(c) => atualizarCampo(campo.id, c)}
            onRemover={() => removerCampo(campo.id)}
          />
        ))}
      </div>

      {/* Add campo */}
      <div className="border-t border-slate-100 pt-4 shrink-0">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Adicionar Campo</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {TIPOS_CAMPO.map((t) => (
            <button
              key={t.tipo}
              onClick={() => setTipoCampoNovo(t.tipo)}
              title={t.descricao}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${tipoCampoNovo === t.tipo ? "bg-[#2655e8] text-white border-[#2655e8]" : "bg-white border-slate-200 text-slate-600 hover:border-[#2655e8] hover:text-[#2655e8]"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button
          onClick={adicionarCampo}
          className="w-full py-3 border-2 border-dashed border-[#c7d2fe] text-[#2655e8] text-sm font-bold rounded-xl hover:bg-[#eef2ff] transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" /> Adicionar campo do tipo "{TIPOS_CAMPO.find((t) => t.tipo === tipoCampoNovo)?.label}"
        </button>
      </div>
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────

const ABAS: { key: Aba; label: string; icon: React.ReactNode; section: string }[] = [
  { key: "template-ni",      label: "Template — Incidente",       icon: <AlertTriangle className="w-4 h-4" />,  section: "Templates de Notificação" },
  { key: "template-nc",      label: "Template — Não Conformidade", icon: <FileWarning className="w-4 h-4" />,   section: "Templates de Notificação" },
  { key: "template-ouvidoria",label: "Template — Ouvidoria",       icon: <HeartHandshake className="w-4 h-4" />, section: "Templates de Notificação" },
  { key: "triagem",          label: "Template de Triagem",        icon: <ClipboardList className="w-4 h-4" />, section: "Fluxo Interno" },
  { key: "tratativa",        label: "Template de Tratativa",      icon: <Wrench className="w-4 h-4" />,        section: "Fluxo Interno" },
  { key: "geral",            label: "Configurações Gerais",       icon: <Settings className="w-4 h-4" />,      section: "Geral" },
];

export default function OcorrenciasConfigPage() {
  const [aba, setAba] = useState<Aba>("template-ni");
  const [aviso, setAviso] = useState<string | null>(null);

  const [tplNI,  setTplNI]  = useState<TemplateRegistro>(TEMPLATE_NI_INICIAL);
  const [tplNC,  setTplNC]  = useState<TemplateRegistro>(TEMPLATE_NC_INICIAL);
  const [tplOUV, setTplOUV] = useState<TemplateRegistro>(TEMPLATE_OUV_INICIAL);
  const [tplTriagem,  setTplTriagem]  = useState<TemplateTriagem>(TEMPLATE_TRIAGEM_INICIAL);
  const [tplTratativa, setTplTratativa] = useState<TemplateTratativa>(TEMPLATE_TRATATIVA_INICIAL);
  const [prefixos, setPrefixos] = useState<Prefixos>(PREFIXOS_INICIAL);
  const [qrAtivo, setQrAtivo] = useState(true);

  function notificar(msg: string) {
    setAviso(msg);
    setTimeout(() => setAviso(null), 3000);
  }

  function salvar() {
    notificar("Configurações salvas com sucesso.");
  }

  // Agrupamento por seção
  const sections = [...new Set(ABAS.map((a) => a.section))];

  // ─── RENDERS ──────────────────────────────────────────────────────────────

  function renderConteudo() {
    switch (aba) {
      case "template-ni":
        return (
          <FormBuilder
            titulo="Template de Notificação de Incidente"
            descricao="Define os campos que o notificador verá ao registrar um incidente (NI-XXXX)."
            template={tplNI}
            onChange={setTplNI}
          />
        );
      case "template-nc":
        return (
          <FormBuilder
            titulo="Template de Não Conformidade"
            descricao="Define os campos que o notificador verá ao registrar uma não conformidade (NC-XXXX)."
            template={tplNC}
            onChange={setTplNC}
          />
        );
      case "template-ouvidoria":
        return (
          <FormBuilder
            titulo="Template de Ouvidoria"
            descricao="Formulário unificado para Elogios (EL), Reclamações (RC) e Manifestações (MF)."
            template={tplOUV}
            onChange={setTplOUV}
          />
        );

      case "triagem":
        return (
          <div className="flex flex-col h-full animate-in fade-in">
            <div className="mb-6 p-5 bg-slate-50 border border-slate-200 rounded-2xl">
              <h3 className="text-base font-black text-slate-900 mb-0.5">Template de Triagem</h3>
              <p className="text-sm text-slate-500">Campos que a equipe de Qualidade preencherá ao avaliar e assumir um registro na fila de triagem.</p>
              <p className="text-xs text-slate-400 mt-2">
                Os campos abaixo são adicionados ao formulário de triagem. O responsável e o prazo são sempre solicitados automaticamente.
              </p>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2.5 custom-scrollbar pr-1 mb-4">
              {tplTriagem.campos.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
                  <ClipboardList className="w-8 h-8 mb-2 opacity-50" />
                  <p className="text-sm font-medium">Nenhum campo adicionado.</p>
                </div>
              )}
              {tplTriagem.campos.map((campo, i) => (
                <EditorCampo
                  key={campo.id}
                  campo={campo}
                  index={i}
                  total={tplTriagem.campos.length}
                  onChange={(c) => setTplTriagem((t) => ({ ...t, campos: t.campos.map((x) => x.id === campo.id ? c : x) }))}
                  onRemover={() => setTplTriagem((t) => ({ ...t, campos: t.campos.filter((x) => x.id !== campo.id) }))}
                />
              ))}
            </div>
            <div className="border-t border-slate-100 pt-4 shrink-0">
              <button
                onClick={() => setTplTriagem((t) => ({ ...t, campos: [...t.campos, campoPadrao("", "TEXTO")] }))}
                className="w-full py-3 border-2 border-dashed border-[#c7d2fe] text-[#2655e8] text-sm font-bold rounded-xl hover:bg-[#eef2ff] transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Adicionar Campo de Triagem
              </button>
            </div>
          </div>
        );

      case "tratativa":
        return (
          <div className="flex flex-col h-full animate-in fade-in overflow-y-auto custom-scrollbar">
            <div className="mb-6 p-5 bg-slate-50 border border-slate-200 rounded-2xl shrink-0">
              <h3 className="text-base font-black text-slate-900 mb-0.5">Template de Tratativa</h3>
              <p className="text-sm text-slate-500">Configure quais ferramentas e seções estarão disponíveis na etapa de tratativa de cada registro.</p>
            </div>

            <div className="space-y-3 mb-8">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Ferramentas de Análise de Causa</p>

              <div className={`border-2 rounded-2xl p-5 transition-all ${tplTratativa.usarIshikawa ? "border-violet-200 bg-violet-50/50" : "border-slate-200 bg-white"}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-bold text-slate-800">Diagrama de Ishikawa (Espinha de peixe)</p>
                    <p className="text-xs text-slate-500 mt-1">Ferramenta visual para identificar causas raízes distribuídas em categorias (6M): Método, Mão de obra, Material, Máquina, Medição, Meio ambiente.</p>
                  </div>
                  <button onClick={() => setTplTratativa((t) => ({ ...t, usarIshikawa: !t.usarIshikawa }))} className={`relative w-12 h-6 rounded-full transition-colors shrink-0 mt-0.5 ${tplTratativa.usarIshikawa ? "bg-[#2655e8]" : "bg-slate-200"}`}>
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${tplTratativa.usarIshikawa ? "translate-x-6" : ""}`} />
                  </button>
                </div>
              </div>

              <div className={`border-2 rounded-2xl p-5 transition-all ${tplTratativa.usar5Porques ? "border-amber-200 bg-amber-50/50" : "border-slate-200 bg-white"}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-bold text-slate-800">5 Porquês</p>
                    <p className="text-xs text-slate-500 mt-1">Técnica sequencial de questionamento para identificar a causa raiz, perguntando "Por quê?" cinco vezes de forma encadeada até a causa real emergir.</p>
                  </div>
                  <button onClick={() => setTplTratativa((t) => ({ ...t, usar5Porques: !t.usar5Porques }))} className={`relative w-12 h-6 rounded-full transition-colors shrink-0 mt-0.5 ${tplTratativa.usar5Porques ? "bg-[#2655e8]" : "bg-slate-200"}`}>
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${tplTratativa.usar5Porques ? "translate-x-6" : ""}`} />
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-3 mb-8">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Plano de Ação e Acompanhamento</p>
              <div className={`border-2 rounded-2xl p-5 transition-all ${tplTratativa.usarPlanoAcao ? "border-blue-200 bg-blue-50/50" : "border-slate-200 bg-white"}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-bold text-slate-800">Plano de Ação (5W2H)</p>
                    <p className="text-xs text-slate-500 mt-1">Tabela de ações corretivas/preventivas com responsável, prazo e status. O responsável pela tratativa alimenta e acompanha cada ação.</p>
                  </div>
                  <button onClick={() => setTplTratativa((t) => ({ ...t, usarPlanoAcao: !t.usarPlanoAcao }))} className={`relative w-12 h-6 rounded-full transition-colors shrink-0 mt-0.5 ${tplTratativa.usarPlanoAcao ? "bg-[#2655e8]" : "bg-slate-200"}`}>
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${tplTratativa.usarPlanoAcao ? "translate-x-6" : ""}`} />
                  </button>
                </div>
              </div>

              <div className={`border-2 rounded-2xl p-5 transition-all ${tplTratativa.usarComentarios ? "border-emerald-200 bg-emerald-50/50" : "border-slate-200 bg-white"}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-bold text-slate-800">Campo de Comentários</p>
                    <p className="text-xs text-slate-500 mt-1">Permite que os envolvidos adicionem observações livres durante a tratativa. Todos os comentários são registrados no histórico com data e autor.</p>
                  </div>
                  <button onClick={() => setTplTratativa((t) => ({ ...t, usarComentarios: !t.usarComentarios }))} className={`relative w-12 h-6 rounded-full transition-colors shrink-0 mt-0.5 ${tplTratativa.usarComentarios ? "bg-[#2655e8]" : "bg-slate-200"}`}>
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${tplTratativa.usarComentarios ? "translate-x-6" : ""}`} />
                  </button>
                </div>
              </div>
            </div>

            {/* Preview da tratativa */}
            <div className="p-5 bg-slate-900 rounded-2xl shrink-0">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Preview — Etapa de Tratativa</p>
              <div className="flex flex-wrap gap-2">
                {tplTratativa.usarIshikawa && <span className="px-3 py-1.5 bg-violet-500 text-white text-xs font-bold rounded-lg">Ishikawa</span>}
                {tplTratativa.usar5Porques && <span className="px-3 py-1.5 bg-amber-500 text-white text-xs font-bold rounded-lg">5 Porquês</span>}
                {tplTratativa.usarPlanoAcao && <span className="px-3 py-1.5 bg-blue-500 text-white text-xs font-bold rounded-lg">Plano de Ação</span>}
                {tplTratativa.usarComentarios && <span className="px-3 py-1.5 bg-emerald-500 text-white text-xs font-bold rounded-lg">Comentários</span>}
                {!tplTratativa.usarIshikawa && !tplTratativa.usar5Porques && !tplTratativa.usarPlanoAcao && !tplTratativa.usarComentarios && (
                  <span className="text-xs text-slate-500">Nenhuma seção ativa.</span>
                )}
              </div>
            </div>
          </div>
        );

      case "geral":
        return (
          <div className="flex flex-col animate-in fade-in overflow-y-auto custom-scrollbar">
            <div className="mb-6 p-5 bg-slate-50 border border-slate-200 rounded-2xl">
              <h3 className="text-base font-black text-slate-900 mb-0.5">Configurações Gerais do Módulo</h3>
              <p className="text-sm text-slate-500">Defina os prefixos de código, número de dígitos e demais parâmetros globais do módulo.</p>
            </div>

            {/* Prefixos de código */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-5">
              <h4 className="text-sm font-black text-slate-800 mb-1 flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-[#2655e8]" /> Prefixos e Numeração</h4>
              <p className="text-xs text-slate-500 mb-5">Cada tipo de notificação terá um código único com o formato: PREFIXO-NNNN (ex: NI-0001). O contador é independente por tipo.</p>
              <div className="grid grid-cols-2 gap-4 mb-5">
                {(["NI", "NC", "EL", "RC", "MF"] as const).map((tipo) => {
                  const labels: Record<string, string> = {
                    NI: "Notificação de Incidente",
                    NC: "Não Conformidade",
                    EL: "Elogio",
                    RC: "Reclamação",
                    MF: "Manifestação",
                  };
                  return (
                    <div key={tipo} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex-1">
                        <p className="text-xs font-bold text-slate-600">{labels[tipo]}</p>
                        <p className="text-[10px] text-slate-400">Prefixo do código</p>
                      </div>
                      <input
                        value={prefixos[tipo]}
                        onChange={(e) => setPrefixos((p) => ({ ...p, [tipo]: e.target.value.toUpperCase().slice(0, 3) }))}
                        className="w-20 text-center font-mono font-black text-sm px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#2655e8]"
                        maxLength={3}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Dígitos do Número</label>
                  <select value={prefixos.digitos} onChange={(e) => setPrefixos((p) => ({ ...p, digitos: Number(e.target.value) }))} className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#2655e8] font-bold">
                    <option value={3}>3 dígitos (NI-001)</option>
                    <option value={4}>4 dígitos (NI-0001)</option>
                    <option value={5}>5 dígitos (NI-00001)</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Exemplo de código gerado</label>
                  <div className="flex gap-2 flex-wrap">
                    {(["NI", "NC", "EL", "RC", "MF"] as const).map((tipo) => (
                      <span key={tipo} className="font-mono font-black text-sm px-3 py-1.5 bg-[#eef2ff] text-[#2655e8] rounded-lg border border-[#c7d2fe]">
                        {prefixos[tipo]}-{"1".padStart(prefixos.digitos, "0")}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* QR Code */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-5">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h4 className="text-sm font-black text-slate-800 flex items-center gap-2 mb-1"><QrCode className="w-4 h-4 text-[#2655e8]" /> QR Code de Acesso Rápido</h4>
                  <p className="text-xs text-slate-500">Gera um QR Code que direciona ao formulário de registro, podendo ser impresso e fixado em murais, banheiros ou áreas de atendimento.</p>
                </div>
                <button onClick={() => setQrAtivo(!qrAtivo)} className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${qrAtivo ? "bg-[#2655e8]" : "bg-slate-200"}`}>
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${qrAtivo ? "translate-x-6" : ""}`} />
                </button>
              </div>
              {qrAtivo && (
                <div className="flex gap-4 items-center">
                  <div className="w-24 h-24 bg-slate-100 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center">
                    <QrCode className="w-10 h-10 text-slate-300" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-2">Um QR Code único será gerado para cada tipo de notificação.</p>
                    <button onClick={() => notificar("QR Codes gerados. Disponíveis para download.")} className="px-4 py-2 bg-[#eef2ff] border border-[#c7d2fe] text-[#2655e8] text-xs font-bold rounded-xl hover:bg-[#e0e7ff] transition-colors flex items-center gap-2">
                      <QrCode className="w-3.5 h-3.5" /> Gerar QR Codes
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Workflow */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <h4 className="text-sm font-black text-slate-800 mb-1 flex items-center gap-2"><FileText className="w-4 h-4 text-[#2655e8]" /> Workflow Padrão</h4>
              <p className="text-xs text-slate-500 mb-4">Sequência obrigatória de etapas para todos os registros do módulo.</p>
              <div className="flex items-center gap-2 flex-wrap">
                {[
                  { label: "Usuário Registra", color: "bg-blue-100 text-blue-700" },
                  { label: "→", color: "text-slate-400" },
                  { label: "Qualidade Avalia (Triagem)", color: "bg-violet-100 text-violet-700" },
                  { label: "→", color: "text-slate-400" },
                  { label: "Responsável Trata", color: "bg-amber-100 text-amber-700" },
                  { label: "→", color: "text-slate-400" },
                  { label: "Aprovador Valida", color: "bg-cyan-100 text-cyan-700" },
                  { label: "→", color: "text-slate-400" },
                  { label: "Qualidade — Eficácia", color: "bg-purple-100 text-purple-700" },
                  { label: "→", color: "text-slate-400" },
                  { label: "Concluído", color: "bg-emerald-100 text-emerald-700" },
                ].map((step, i) => (
                  <span key={i} className={`px-2.5 py-1.5 rounded-lg text-xs font-bold ${step.color}`}>{step.label}</span>
                ))}
              </div>
            </div>
          </div>
        );

      default: return null;
    }
  }

  return (
    <div className="h-full bg-slate-50/50 flex animate-in fade-in duration-500">

      {/* Toast */}
      {aviso && (
        <div className="fixed right-6 top-6 z-50 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 shadow-lg">
          <CheckCircle2 className="h-4 w-4" /> {aviso}
        </div>
      )}

      {/* Sidebar */}
      <div className="w-72 bg-white border-r border-slate-200 flex flex-col shrink-0">
        <div className="p-5 border-b border-slate-100">
          <Link href="/ocorrencias" className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-[#2655e8] transition-colors mb-4">
            <ArrowLeft className="w-3.5 h-3.5" /> Voltar para Ocorrências
          </Link>
          <h1 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#2655e8]" /> Configurações
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Módulo de Ocorrências & Eventos</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-5">
          {sections.map((section) => (
            <div key={section}>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-3 mb-2">{section}</h4>
              <div className="space-y-1">
                {ABAS.filter((a) => a.section === section).map((item) => {
                  const ativo = aba === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => setAba(item.key)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all outline-none ${ativo ? "bg-[#eef2ff] text-[#2655e8]" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
                    >
                      {item.icon} {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Save */}
        <div className="p-4 border-t border-slate-100 shrink-0">
          <button onClick={salvar} className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#2655e8] text-white text-sm font-bold rounded-xl hover:bg-[#1e40af] transition-colors shadow-sm">
            <Save className="w-4 h-4" /> Salvar Configurações
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 p-8 overflow-hidden flex flex-col">
        {renderConteudo()}
      </div>
    </div>
  );
}
