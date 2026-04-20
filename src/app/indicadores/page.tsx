"use client";

import React, { useState, useMemo } from "react";
import {
  TrendingUp, TrendingDown, Minus, CheckCircle2,
  ArrowLeft, Download, Save, BarChart2, LineChart, 
  Settings2, TableProperties, PlusCircle, Trash2, GitCompare,
  Search, ChevronRight, ChevronDown, Calendar, FolderTree, 
  FileCheck, Activity, Plus, XCircle, FileText, 
  MessageSquarePlus, AlertTriangle, Eye, ArrowRight, PieChart, BarChart3
} from "lucide-react";

// ─── DADOS ZERADOS (SISTEMA LIMPO) ──────────────────────────────────────────
const INITIAL_DATA_IND1: any[] = [];
const INITIAL_DATA_IND2: any[] = [];
const INDICATORS: any[] = [];

const SETORES = [
  { nome: "Qualidade", sigla: "QUA", cor: "#6366f1" },
  { nome: "UTI Adulto", sigla: "UTI", cor: "#ef4444" },
  { nome: "Pronto Atendimento", sigla: "PA", cor: "#eab308" },
  { nome: "Centro Cirúrgico", sigla: "CC", cor: "#22c55e" },
  { nome: "Farmácia", sigla: "FAR", cor: "#14b8a6" },
  { nome: "Recursos Humanos", sigla: "RH", cor: "#a855f7" },
];

const RESPONSAVEIS = ["Ana Silva", "Dr. Carlos", "Enf. Roberta", "João Pedro", "Dra. Marina"];

const ALL_INDICATORS: any[] = [];
const MOCK_ACOES: any[] = [];
const MOCK_FICHAS: any[] = [];
const MOCK_ANALISES: any[] = [];

const statusColors: any = { verde: "bg-emerald-500", amarelo: "bg-amber-400", vermelho: "bg-red-500" };

// ─── CONSTANTES GLOBAIS DE COR ───────────────────────────────────────────────
const MAIN_COLOR = "#2655e8"; // roxo forte
const LABEL_COLOR = "#000000"; // Preto absoluto
const TARGET_RED = "#ff0000"; // Vermelho absoluto
const BORDER_LIGHT_BLUE = "#f1f5f9"; // Slate 100

// ─── UTILS ───────────────────────────────────────────────────────────────────
const formatValue = (v: number | null | undefined, tipo: string, forceDecimals?: number) => {
  if (v == null || isNaN(v)) return "-";
  const vNum = Number(v);
  const d = forceDecimals !== undefined ? forceDecimals : 1;
  if (tipo === "percentual") return `${vNum.toFixed(d)}%`;
  if (tipo === "moeda") return `R$ ${vNum.toLocaleString('pt-BR', { minimumFractionDigits: d })}`;
  if (tipo === "tempo") return `${vNum.toFixed(d)}h`;
  return vNum.toFixed(d);
};

function TIcon({ val, target, pol, t }: any) {
  if (t === "flat") return <Minus className="w-4 h-4 text-slate-400" />;
  const isUp = val !== undefined && target !== undefined ? val > target : t === "up";
  const isGood = (isUp && pol === "Maior Melhor") || (!isUp && pol === "Menor Melhor");
  return isUp ? <TrendingUp className={`w-4 h-4 ${isGood ? "text-emerald-500" : "text-red-500"}`} /> : <TrendingDown className={`w-4 h-4 ${isGood ? "text-emerald-500" : "text-red-500"}`} />;
}

function getInitials(name: string) { return name.replace(/Dr\. |Dra\. |Enf\. /g, "").split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase(); }

function SectionTitle({ title, subtitle }: { title: string, subtitle?: string }) {
  return <div className="mb-4"><h3 className="text-lg font-bold text-slate-800 tracking-tight">{title}</h3>{subtitle && <p className="text-[11px] text-slate-500 font-medium mt-1">{subtitle}</p>}</div>;
}

function VarianceBadge({ value, invert = false }: { value: number, invert?: boolean }) {
  if (value === 0) return <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full"><Minus className="w-3 h-3"/> 0%</span>;
  const isPositive = value > 0;
  const isGood = invert ? !isPositive : isPositive;

  return (
    <span className={`flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-md border shadow-sm tracking-tight ${isGood ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
      {isPositive ? <TrendingUp className="w-3.5 h-3.5"/> : <TrendingDown className="w-3.5 h-3.5"/>}
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

// ─── ENGINE: GRÁFICO PRINCIPAL ───────────────────────────────────────────────
function PremiumChart({ data, config, metaStyle, faixas }: any) {
  const W = 900, H = 420; 
  const PAD = { t: 60, r: 30, b: 40, l: 45 }; 
  const cW = W - PAD.l - PAD.r;
  const cH = H - PAD.t - PAD.b;

  const validData = data.filter((d:any) => d.realizado != null);
  const globalMeta = data.length > 0 ? data[0].meta : 0;

  const activeExtras = (config.extraSeries || []).filter((s:any) => s.active);
  const allSeries = [
    { key: 'realizado', label: 'Realizado', type: config.tipoGrafico, color: MAIN_COLOR },
    ...activeExtras
  ];

  const barSeries = allSeries.filter(s => s.type === 'bar');
  const lineSeries = allSeries.filter(s => s.type === 'line' || s.type === 'misto');

  let calcMin = 0;
  let calcMax = 100;
  if (validData.length > 0) {
    const allValues = validData.flatMap((d:any) => allSeries.map(s => Number(d[s.key]) || 0));
    calcMin = Math.min(...allValues, globalMeta);
    calcMax = Math.max(...allValues, globalMeta);
  }
  
  const vMin = config.eixoYAuto ? (calcMin * 0.8) : config.eixoYMin;
  const vMax = config.eixoYAuto ? (calcMax * 1.1) : config.eixoYMax;
  const range = vMax - vMin || 1;

  const toY = (v: number) => PAD.t + (1 - (v - vMin) / range) * cH;
  
  const totalGroupW = 36;
  const gap = 2;
  const singleBarW = barSeries.length > 0 ? (totalGroupW - (gap * (barSeries.length - 1))) / barSeries.length : 0;
  
  const innerPad = totalGroupW / 2 + 6; 
  const usableW = cW - 2 * innerPad; 
  const toX = (i: number) => PAD.l + innerPad + (i / Math.max(1, data.length - 1)) * usableW;

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} className="block overflow-visible font-sans select-none">
      
      {/* Background Frame do Gráfico */}
      <rect x={PAD.l} y={PAD.t} width={cW} height={cH} fill="#ffffff" stroke={BORDER_LIGHT_BLUE} strokeWidth="1.5" />

      {/* Eixo Y Linhas internas e Rótulos Externos */}
      {config.mostrarEixoY && [0, 0.25, 0.5, 0.75, 1].map((f, i) => (
        <g key={`y-${i}`}>
          <line x1={PAD.l} y1={PAD.t + f * cH} x2={PAD.l + cW} y2={PAD.t + f * cH} stroke="#f1f5f9" strokeWidth="1"/>
          <text x={PAD.l - 8} y={PAD.t + f * cH + 4} textAnchor="end" fill="#475569" fontSize="12" fontWeight="600">
            {formatValue(vMax - f * range, config.formato, 0)}
          </text>
        </g>
      ))}

      {/* Faixas de Limite (Background Semáforo) */}
      {config.mostrarFaixas && faixas.map((f: any, i: number) => {
        const yTop = toY(f.max), yBot = toY(f.min), h = Math.abs(yBot - yTop);
        return <rect key={i} x={PAD.l} y={Math.min(yTop, yBot)} width={cW} height={h} fill={f.cor} fillOpacity={f.opacidade} />;
      })}

      {/* Barras Agrupadas Dinâmicas */}
      {barSeries.map((series, sIdx) => {
        return validData.map((d:any, i:number) => {
          const val = d[series.key];
          if (val == null) return null;

          const cx = toX(i);
          const yPos = toY(val);
          const height = Math.max(0, PAD.t + cH - yPos);
          const offset = (sIdx - (barSeries.length - 1) / 2) * (singleBarW + gap);
          const xPos = cx + offset - singleBarW / 2;

          return (
            <rect key={`bar-${series.key}-${i}`} x={xPos} y={yPos} width={singleBarW} height={height} fill={series.color} className="transition-all duration-300 opacity-95 hover:opacity-100" />
          );
        });
      })}

      {/* Linhas Dinâmicas */}
      {lineSeries.map((series) => {
        const pts = validData.filter((d: any) => d[series.key] != null).map((d:any, i:number) => `${toX(i)},${toY(d[series.key])}`).join(" L ");
        return pts ? <path key={`line-${series.key}`} d={`M ${pts}`} fill="none" stroke={series.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="transition-all duration-700" /> : null;
      })}

      {/* Linha de Meta (Vermelho Absoluto) */}
      {config.mostrarMeta && data.length > 0 && (
        <g className="transition-all duration-500">
          <line x1={PAD.l} y1={toY(globalMeta)} x2={PAD.l + cW} y2={toY(globalMeta)} stroke={TARGET_RED} strokeWidth="1.5" strokeDasharray="4 4" opacity="0.8"/>
          <rect x={PAD.l + cW - 60} y={toY(globalMeta) - 12} width="60" height="24" fill="#fff" stroke={TARGET_RED} strokeWidth="1.5" rx="12" />
          <text x={PAD.l + cW - 30} y={toY(globalMeta) + 4} textAnchor="middle" fill={TARGET_RED} fontSize="11" fontWeight="800">Meta: {globalMeta}</text>
        </g>
      )}

      {/* Rótulos e Pontos Combinados */}
      {allSeries.map((series) => {
         return validData.map((d:any, i:number) => {
            const val = d[series.key];
            if (val == null) return null;
            const cx = toX(i);
            const cy = toY(val);
            const isLine = series.type === 'line' || series.type === 'misto';

            return (
              <g key={`lbl-${series.key}-${i}`} className="transition-all duration-500">
                {isLine && (
                  <circle cx={cx} cy={cy} r="4" fill="#fff" stroke={series.color} strokeWidth="2.5" />
                )}
                {config.mostrarRotulos && (
                  <text x={cx} y={cy - 12} textAnchor="middle" fill={LABEL_COLOR} fontSize="13" fontWeight="500">
                    {formatValue(val, config.formato, config.decimais)}
                  </text>
                )}
              </g>
            );
         });
      })}

      {/* Eixo X com Ticks */}
      {data.map((d:any, i:number) => {
        const cx = toX(i);
        return (
          <g key={`x-${i}`}>
            <line x1={cx} y1={PAD.t + cH} x2={cx} y2={PAD.t + cH + 6} stroke="#e2e8f0" strokeWidth="1.5" />
            <text x={cx} y={PAD.t + cH + 22} textAnchor="middle" fill="#475569" fontSize="12" fontWeight="600">
              {d.periodo}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── COMPONENTE: GRÁFICO COMPARATIVO AUXILIAR LATERAIS ───────────────────────
function MiniBarChart({ title, labelA1, labelA2, valA, colorA, labelB1, labelB2, valB, colorB, showTrendLine, tipo }: any) {
  const W = 200, H = 360; 
  const PAD = { t: 20, r: 10, b: 50, l: 40 };
  const cH = H - PAD.t - PAD.b;
  const cW = W - PAD.l - PAD.r;

  const vMax = Math.max(valA, valB) * 1.2 || 1;
  const pctA = (valA / vMax) * 100;
  const pctB = (valB / vMax) * 100;

  const barW = 36;
  const innerPad = barW / 2 + 14;
  const usableW = cW - 2 * innerPad;

  const xA = PAD.l + innerPad;
  const xB = PAD.l + innerPad + usableW;

  return (
    <div className="flex flex-col h-full relative bg-white border border-slate-100 rounded-[1.5rem] shadow-sm">
      <div className="text-center mt-6 shrink-0 px-2 h-10 flex items-center justify-center">
        <h4 className="text-[11px] font-black text-slate-600 uppercase tracking-widest leading-tight">{title}</h4>
      </div>

      <div className="flex-1 w-full min-h-0 flex justify-center pb-2">
        <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} className="block overflow-visible font-sans select-none">
          <rect x={PAD.l} y={PAD.t} width={cW} height={cH} fill="#ffffff" stroke={BORDER_LIGHT_BLUE} strokeWidth="1.5" />
          
          {[0, 0.25, 0.5, 0.75, 1].map((f, i) => (
            <g key={`my-${i}`}>
              <line x1={PAD.l} y1={PAD.t + f * cH} x2={PAD.l + cW} y2={PAD.t + f * cH} stroke="#f1f5f9" strokeWidth="1"/>
              <text x={PAD.l - 8} y={PAD.t + f * cH + 4} textAnchor="end" fill="#64748b" fontSize="11" fontWeight="600">
                {formatValue(vMax - f * vMax, tipo, 0)}
              </text>
            </g>
          ))}

          {showTrendLine && (
            <line x1={xA} y1={PAD.t + (1 - pctA/100)*cH} x2={xB} y2={PAD.t + (1 - pctB/100)*cH} stroke={LABEL_COLOR} strokeWidth="2" strokeDasharray="4 4" />
          )}

          <g>
            <rect x={xA - barW/2} y={PAD.t + (1 - pctA/100)*cH} width={barW} height={Math.max(0, (pctA/100)*cH)} fill={colorA} rx="2" />
            <text x={xA} y={PAD.t + (1 - pctA/100)*cH - 10} textAnchor="middle" fill={LABEL_COLOR} fontSize="13" fontWeight="500">{formatValue(valA, tipo, 1)}</text>
            <text x={xA} y={H - 30} textAnchor="middle" fill={LABEL_COLOR} fontSize="12" fontWeight="700">{labelA1}</text>
            <text x={xA} y={H - 14} textAnchor="middle" fill={LABEL_COLOR} fontSize="12" fontWeight="700">{labelA2}</text>
          </g>

          <g>
            <rect x={xB - barW/2} y={PAD.t + (1 - pctB/100)*cH} width={barW} height={Math.max(0, (pctB/100)*cH)} fill={colorB} rx="2" />
            <text x={xB} y={PAD.t + (1 - pctB/100)*cH - 10} textAnchor="middle" fill={LABEL_COLOR} fontSize="13" fontWeight="500">{formatValue(valB, tipo, 1)}</text>
            <text x={xB} y={H - 30} textAnchor="middle" fill={LABEL_COLOR} fontSize="12" fontWeight="700">{labelB1}</text>
            <text x={xB} y={H - 14} textAnchor="middle" fill={LABEL_COLOR} fontSize="12" fontWeight="700">{labelB2}</text>
          </g>
        </svg>
      </div>
    </div>
  );
}

// ─── COMPARAÇÃO OVERLAY DE DOIS INDICADORES ───────────────────────────────────
function IndicatorComparisonChart({ ind1Data, ind2Data, config1, config2 }: any) {
  const W = 1000, H = 400;
  const PAD = { t: 60, r: 60, b: 60, l: 60 };
  const cW = W - PAD.l - PAD.r, cH = H - PAD.t - PAD.b;

  const valid1 = ind1Data.filter((d: any) => d.realizado != null);
  const valid2 = ind2Data.filter((d: any) => d.realizado != null);

  const vMax1 = 100;
  const vMax2 = 120;
  
  const toX = (i: number, len: number) => PAD.l + (i / Math.max(1, len - 1)) * cW;
  const toY1 = (v: number) => PAD.t + (1 - v / vMax1) * cH;
  const toY2 = (v: number) => PAD.t + (1 - v / vMax2) * cH;

  const pts1 = valid1.map((d: any, i: number) => `${toX(i, valid1.length)},${toY1(d.realizado)}`).join(" L ");
  const pts2 = valid2.map((d: any, i: number) => `${toX(i, valid2.length)},${toY2(d.realizado)}`).join(" L ");

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} className="block overflow-visible font-sans select-none">
      <rect x={PAD.l} y={PAD.t} width={cW} height={cH} fill="#ffffff" stroke={BORDER_LIGHT_BLUE} strokeWidth="1.5" />
      
      {[0, 0.25, 0.5, 0.75, 1].map((f, i) => (
        <g key={i}>
          <line x1={PAD.l} y1={PAD.t + f * cH} x2={PAD.l + cW} y2={PAD.t + f * cH} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4"/>
          <text x={PAD.l - 10} y={PAD.t + f * cH + 4} textAnchor="end" fill={MAIN_COLOR} fontSize="11" fontWeight="600">{formatValue(vMax1 - f * vMax1, config1.formato, 0)}</text>
          <text x={PAD.l + cW + 10} y={PAD.t + f * cH + 4} textAnchor="start" fill="#4f46e5" fontSize="11" fontWeight="600">{formatValue(vMax2 - f * vMax2, config2.formato, 0)}</text>
        </g>
      ))}

      {pts1 && <path d={`M ${pts1}`} fill="none" stroke={MAIN_COLOR} strokeWidth="3" className="transition-all duration-700"/>}
      {pts2 && <path d={`M ${pts2}`} fill="none" stroke="#818cf8" strokeWidth="3" strokeDasharray="6 4" className="transition-all duration-700"/>}

      {valid1.map((d: any, i: number) => <circle key={`p1-${i}`} cx={toX(i, valid1.length)} cy={toY1(d.realizado)} r="5" fill="#fff" stroke={MAIN_COLOR} strokeWidth="2.5"/>)}
      {valid2.map((d: any, i: number) => <circle key={`p2-${i}`} cx={toX(i, valid2.length)} cy={toY2(d.realizado)} r="5" fill="#fff" stroke="#818cf8" strokeWidth="2.5"/>)}
      
      {ind1Data.map((d: any, i: number) => <text key={`x-${i}`} x={toX(i, ind1Data.length)} y={H - 20} textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="600">{d.periodo}</text>)}
    </svg>
  );
}

// ─── DRILL-DOWN: DETALHE DO INDICADOR (ANALYZER EXECUTIVO) ───────────────────
function IndicadorDetailView({ ind, onBack }: { ind: any, onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<'dados'|'compare'|'config_grafico'|'config_kpi'|'capa'>('dados');
  const [capaView, setCapaView] = useState<'list'|'detail'>('list');
  
  // Dados limpos no detalhamento
  const [dataSeries1, setDataSeries1] = useState<any[]>([]);
  const [dataSeries2] = useState<any[]>([]);

  const [extraSeries, setExtraSeries] = useState([
    { key: 'extra1', label: 'Série Opcional 1', active: false, type: 'line', color: '#10b981' },
    { key: 'extra2', label: 'Série Opcional 2', active: false, type: 'line', color: '#f59e0b' },
    { key: 'extra3', label: 'Série Opcional 3', active: false, type: 'line', color: '#8b5cf6' },
    { key: 'extra4', label: 'Série Opcional 4', active: false, type: 'line', color: '#ec4899' },
  ]);

  const [kpiConfig1, setKpiConfig1] = useState({ nome: ind.nome, setor: ind.setor, formato: ind.unidade === "%" ? "percentual" : "absoluto", decimais: 1, polaridade: ind.polaridade, agrupamento: 1 });
  const [kpiConfig2] = useState({ formato: "numero", agrupamento: 1 });

  const [chartConfig1, setChartConfig1] = useState({ tipoGrafico: "bar", eixoYAuto: true, eixoYMin: 0, eixoYMax: 100, mostrarMediana: false, mostrarRotulos: true, mostrarFaixas: false, mostrarEixoY: true, mostrarMeta: true });
  const [metaStyle, setMetaStyle] = useState({ mostrar: true, valor: ind.meta || 0, cor: TARGET_RED, espessura: 1.5, tracejada: true, rotulo: "META" });
  
  const faixas = [
    { nome: "Crítico", min: 0, max: (ind.meta || 0)*0.8, cor: "#ef4444", opacidade: 0.05 },
    { nome: "Atenção", min: (ind.meta || 0)*0.8, max: (ind.meta || 0), cor: "#f59e0b", opacidade: 0.05 },
    { nome: "Ideal", min: (ind.meta || 0), max: (ind.meta || 0)*1.5, cor: "#10b981", opacidade: 0.05 },
  ];

  const validData1 = dataSeries1.filter(d => d.realizado != null);
  const ultimoMes1 = validData1.length > 0 ? validData1[validData1.length - 1] : { realizado: 0, meta: ind.meta || 0, periodo: "-" };
  const ytdAtual1 = validData1.length > 0 ? validData1.reduce((a, b) => a + (b.realizado || 0), 0) / validData1.length : 0;
  const prevYtd1 = ind.consolidadoAnterior || 0;
  const metaAnual1 = ind.metaConsolidada || 0;

  const validData2 = dataSeries2.filter(d => d.realizado != null);
  const ytdAtual2 = validData2.length > 0 ? validData2.reduce((a, b) => a + (b.realizado || 0), 0) / validData2.length : 0;
  const metaAnual2 = 85.0;

  const aggregatedData1 = useMemo(() => {
    if (kpiConfig1.agrupamento === 1) return dataSeries1;
    const chunked = [];
    for (let i = 0; i < dataSeries1.length; i += kpiConfig1.agrupamento) {
      const slice = dataSeries1.slice(i, i + kpiConfig1.agrupamento);
      const valids = slice.filter(s => s.realizado != null);
      
      const aggRecord: any = { 
        periodo: kpiConfig1.agrupamento === 3 ? `T${(i/3)+1}` : kpiConfig1.agrupamento === 6 ? `S${(i/6)+1}` : `P${(i/kpiConfig1.agrupamento)+1}`,
        meta: slice.length > 0 ? slice[0].meta : 0 
      };

      const val = valids.length > 0 ? valids.reduce((a, b) => a + (b.realizado as number), 0) / valids.length : null;
      aggRecord.realizado = val;

      extraSeries.filter(es => es.active).forEach(es => {
         const esValids = slice.filter((s:any) => s[es.key] != null);
         aggRecord[es.key] = esValids.length > 0 ? esValids.reduce((a:any, b:any) => a + (b[es.key] as number), 0) / esValids.length : null;
      });

      chunked.push(aggRecord);
    }
    return chunked;
  }, [dataSeries1, kpiConfig1.agrupamento, extraSeries]);

  const handleUpdateTableData = (idx: number, field: string, val: string) => {
    const newSeries = [...dataSeries1] as any[];
    newSeries[idx] = { ...newSeries[idx], [field]: val === "" ? null : field === 'periodo' ? val : Number(val) };
    setDataSeries1(newSeries);
  };

  const handleAddMonth = () => {
    const newSeries = [...dataSeries1] as any[];
    const newId = newSeries.length > 0 ? Math.max(...newSeries.map(d=>d.id)) + 1 : 1;
    newSeries.push({ id: newId, periodo: "Novo", realizado: null, meta: metaStyle.valor, extra1: null, extra2: null, extra3: null, extra4: null });
    setDataSeries1(newSeries);
  }

  const handleDeleteMonth = (id: number) => {
    const newSeries = dataSeries1.filter(d => d.id !== id);
    setDataSeries1(newSeries);
  }

  const handleUpdateExtraSeries = (key: string, field: string, val: any) => {
    setExtraSeries(prev => prev.map(s => s.key === key ? { ...s, [field]: val } : s));
  };

  return (
    <div className="w-full h-full bg-slate-50/50 p-6 md:p-8 flex flex-col animate-in fade-in duration-500">
      <div className="w-full max-w-7xl mx-auto flex flex-col h-full gap-8">
        {/* Header Executivo */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shrink-0 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm w-full">
          <div className="flex items-center gap-5">
            <button onClick={onBack} className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all shadow-sm"><ArrowLeft className="w-5 h-5" /></button>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="text-[10px] font-mono font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">{ind.id || "IND-000"}</span>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{kpiConfig1.setor}</span>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Análise: {kpiConfig1.nome}</h2>
            </div>
          </div>
          <div className="flex items-center gap-6 border-l border-slate-100 pl-6">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Último Fechamento</p>
              <span className="text-2xl font-black text-[#2655e8] leading-none tracking-tight">{formatValue(ultimoMes1.realizado, kpiConfig1.formato, kpiConfig1.decimais)}</span>
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 text-right">Desvio da Meta</p>
              <div className="flex items-center gap-1.5 justify-end">
                <TIcon val={ultimoMes1.realizado as number} target={ultimoMes1.meta} pol={kpiConfig1.polaridade} />
                <span className="text-sm font-bold text-slate-700">{Math.abs((ultimoMes1.realizado as number) - ultimoMes1.meta).toFixed(1)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Área de Gráficos */}
        <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm flex flex-col shrink-0 w-full">
          <div className="flex items-center justify-between mb-6 shrink-0">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Evolução Temporal</h2>
                <p className="text-xs text-slate-500 font-medium mt-1">Análise de tendência {kpiConfig1.agrupamento === 1 ? 'mensal' : 'agregada'}</p>
              </div>
              <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-100 shadow-inner">
                <select value={kpiConfig1.agrupamento} onChange={(e) => setKpiConfig1({...kpiConfig1, agrupamento: Number(e.target.value)})} className="bg-transparent text-[11px] font-bold text-slate-600 outline-none cursor-pointer pl-3 pr-2 py-1">
                  <option value={1}>Mensal</option><option value={2}>Bimestral</option><option value={3}>Trimestral</option><option value={6}>Semestral</option>
                </select>
                <div className="w-px h-4 bg-slate-200 mx-1" />
                <div className="flex gap-1 pr-1">
                  <button onClick={()=>setChartConfig1({...chartConfig1, tipoGrafico: 'line'})} className={`p-1.5 rounded-xl transition-all ${chartConfig1.tipoGrafico === 'line' ? 'bg-white shadow border border-slate-100 text-indigo-600' : 'text-slate-400 hover:text-slate-700'}`}><LineChart className="w-4 h-4"/></button>
                  <button onClick={()=>setChartConfig1({...chartConfig1, tipoGrafico: 'bar'})} className={`p-1.5 rounded-xl transition-all ${chartConfig1.tipoGrafico === 'bar' ? 'bg-white shadow border border-slate-100 text-indigo-600' : 'text-slate-400 hover:text-slate-700'}`}><BarChart2 className="w-4 h-4"/></button>
                </div>
              </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[500px]">
              <div className="lg:col-span-8 min-w-0 relative">
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-tight absolute top-2 left-10">Diagrama</h4>
                {dataSeries1.length === 0 ? (
                  <div className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-2xl text-slate-400 font-bold bg-slate-50/50">
                    <BarChart3 className="w-10 h-10 mb-2 opacity-50"/>
                    Nenhum dado lançado ainda.
                  </div>
                ) : (
                  <PremiumChart data={aggregatedData1} config={{...chartConfig1, formato: kpiConfig1.formato, decimais: kpiConfig1.decimais, extraSeries}} metaStyle={metaStyle} faixas={faixas} />
                )}
              </div>
              
              <div className="lg:col-span-2">
                <MiniBarChart 
                  title="Desempenho Atual x Meta Global"
                  labelA1="Meta" labelA2="" valA={metaAnual1} colorA={TARGET_RED}
                  labelB1="Acum" labelB2="2026" valB={ytdAtual1} colorB={MAIN_COLOR}
                  tipo={kpiConfig1.formato}
                />
              </div>

              <div className="lg:col-span-2">
                <MiniBarChart 
                  title="Consolidado Ano Ant. vs Atual (YTD)"
                  labelA1="Acum" labelA2="2025" valA={prevYtd1} colorA="#94a3b8"
                  labelB1="Acum" labelB2="2026" valB={ytdAtual1} colorB={MAIN_COLOR}
                  tipo={kpiConfig1.formato}
                  showTrendLine={true}
                />
              </div>
          </div>
        </div>

        {/* Painel Inferior (Tabs) */}
        <div className="bg-white border border-slate-100 rounded-[2rem] shadow-sm flex-1 flex flex-col overflow-hidden min-h-[600px] w-full">
          <div className="flex border-b border-slate-100 px-8 pt-2 bg-slate-50/80 overflow-x-auto shrink-0 gap-8">
            {[
              {id:"dados", label:"Alimentação Mensal", icon: TableProperties},
              {id:"compare", label:"Comparar Indicadores", icon: GitCompare},
              {id:"config_grafico", label:"Painel Visual do Gráfico", icon: Settings2},
              {id:"config_kpi", label:"Estrutura do Indicador", icon: FileText},
              {id:"capa", label:"Análise Crítica & CAPA", icon: MessageSquarePlus},
            ].map(t => (
              <button key={t.id} onClick={() => { setActiveTab(t.id as any); if(t.id === 'capa') setCapaView('list'); }} 
                className={`py-5 flex items-center gap-2 text-sm font-bold border-b-[3px] whitespace-nowrap outline-none transition-colors
                  ${activeTab === t.id ? "text-indigo-700 border-indigo-600" : "text-slate-400 border-transparent hover:text-slate-700 hover:border-slate-200"}`}>
                <t.icon className="w-4 h-4" /> {t.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-white relative">
            
            {/* TAB 1: ALIMENTAÇÃO DE DADOS */}
            {activeTab === 'dados' && (
              <div className="animate-in fade-in duration-300 w-full space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Lançamento de Resultados</h3>
                    <p className="text-xs text-slate-500 font-medium mt-1">Insira, edite ou apague os valores. O gráfico é atualizado imediatamente.</p>
                  </div>
                  <div className="flex gap-3">
                    <button className="px-5 py-2.5 bg-white border border-slate-100 text-slate-700 rounded-xl text-xs font-bold shadow-sm hover:bg-slate-50 flex items-center gap-2"><Download className="w-3.5 h-3.5"/> Importar CSV</button>
                    <button className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-md hover:bg-slate-800 flex items-center gap-2"><Save className="w-3.5 h-3.5"/> Salvar Lançamentos</button>
                  </div>
                </div>

                <div className="border border-slate-100 rounded-2xl overflow-x-auto shadow-sm">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase font-black text-slate-400 tracking-widest">
                      <tr>
                        <th className="px-6 py-4 w-32 text-center border-r border-slate-100">Período</th>
                        <th className="px-6 py-4 border-r border-slate-100">Valor Realizado</th>
                        {/* Geração Dinâmica de Cabeçalhos Extras */}
                        {extraSeries.filter(s => s.active).map(s => (
                          <th key={`head-${s.key}`} className="px-6 py-4 border-r border-slate-100">
                              <span style={{ color: s.color }}>{s.label}</span>
                          </th>
                        ))}
                        <th className="px-6 py-4 border-r border-slate-100">Meta Estipulada</th>
                        <th className="px-6 py-4 text-center border-r border-slate-100">Desvio / Status</th>
                        <th className="px-6 py-4 w-12 text-center">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {dataSeries1.length === 0 ? (
                        <tr><td colSpan={5 + extraSeries.filter(s=>s.active).length} className="text-center p-8 text-slate-400 font-medium">Nenhum mês adicionado ainda. Clique abaixo para lançar.</td></tr>
                      ) : dataSeries1.map((row:any, idx:number) => {
                          const desvio = row.realizado != null ? row.realizado - row.meta : 0;
                          const isLast = idx === dataSeries1.length - 1;

                          return (
                            <tr key={row.id} className={`transition-colors group hover:bg-slate-50`}>
                              <td className={`px-6 py-2.5 text-center border-r border-slate-100 bg-slate-50/50`}>
                                <input type="text" value={row.periodo} onChange={(e) => handleUpdateTableData(idx, 'periodo', e.target.value)} className="w-full max-w-[100px] px-2 py-1 text-center font-bold bg-transparent outline-none focus:bg-white focus:shadow focus:rounded-md text-slate-800" />
                                {isLast && <span className="block text-[9px] font-black uppercase tracking-widest mt-0.5 text-indigo-600">Atual</span>}
                              </td>
                              <td className="px-6 py-2.5 border-r border-slate-100">
                                <input 
                                  type="number" value={row.realizado === null ? "" : row.realizado} 
                                  onChange={(e) => handleUpdateTableData(idx, 'realizado', e.target.value)}
                                  className="w-full max-w-[140px] px-4 py-2 border border-slate-100 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all bg-white shadow-sm"
                                  placeholder="-"
                                />
                              </td>
                              {/* Geração Dinâmica de Inputs Extras */}
                              {extraSeries.filter(s => s.active).map(s => (
                                <td key={`cell-${s.key}-${row.id}`} className="px-6 py-2.5 border-r border-slate-100">
                                    <input 
                                      type="number" value={row[s.key] == null ? "" : row[s.key]} 
                                      onChange={(e) => handleUpdateTableData(idx, s.key, e.target.value)}
                                      className="w-full max-w-[140px] px-4 py-2 border border-slate-100 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all bg-white shadow-sm"
                                      placeholder="-"
                                    />
                                </td>
                              ))}
                              <td className="px-6 py-2.5 font-bold text-slate-400 border-r border-slate-100">
                                <input type="number" value={row.meta} onChange={(e) => handleUpdateTableData(idx, 'meta', e.target.value)} className="w-24 px-2 py-1 bg-transparent text-slate-500 outline-none font-bold" />
                              </td>
                              <td className="px-6 py-2.5 text-center border-r border-slate-100">
                                {row.realizado != null ? <VarianceBadge value={desvio} /> : <span className="text-xs text-slate-300 font-bold">-</span>}
                              </td>
                              <td className="px-6 py-2.5 text-center">
                                <button onClick={() => handleDeleteMonth(row.id)} className="p-2.5 rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all flex mx-auto" title="Apagar Mês">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          )
                      })}
                    </tbody>
                  </table>
                </div>
                <button onClick={handleAddMonth} className="w-full p-4 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold text-slate-500 hover:border-indigo-300 hover:text-indigo-600 transition-all bg-white">
                  <PlusCircle className="w-5 h-5"/> Lançar Próximo Período
                </button>
              </div>
            )}

            {/* TAB 2: COMPARAÇÃO OVERLAY */}
            {activeTab === 'compare' && (
              <div className="animate-in fade-in duration-300 space-y-8">
                  <div className="flex justify-between items-center mb-6 shrink-0">
                    <div>
                      <h3 className="text-xl font-bold text-slate-800">Comparativo Multi-Indicador</h3>
                      <p className="text-sm text-slate-500 font-medium mt-1">Overlay de performance entre indicadores diferentes do sistema.</p>
                    </div>
                    <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-100 shadow-inner">
                      <GitCompare className="w-5 h-5 text-indigo-400"/>
                      <select className="bg-transparent text-xs font-bold px-3 py-2 outline-none text-slate-600">
                        <option>Selecione um KPI...</option>
                      </select>
                      <span className="text-xs text-slate-400 font-black">vs</span>
                      <select className="bg-transparent text-xs font-bold px-3 py-2 outline-none text-slate-600">
                        <option>Selecione outro KPI...</option>
                      </select>
                    </div>
                  </div>

                  <div className="w-full h-64 border-2 border-dashed border-slate-100 rounded-3xl flex items-center justify-center text-slate-400 font-bold bg-slate-50">
                     Adicione dados para visualizar comparações
                  </div>
              </div>
            )}

            {/* TAB 3: CONFIGURAÇÃO VISUAL DO GRÁFICO */}
            {activeTab === 'config_grafico' && (
              <div className="animate-in fade-in max-w-4xl space-y-8">
                <SectionTitle title="Parâmetros Visuais do Dashboard" subtitle="Configure eixos, metas e coloração de fundo para leitura gerencial" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  
                  <div className="md:col-span-2 space-y-6 bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-inner">
                      <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 border-b border-slate-100 pb-2">Séries de Dados Adicionais (Até 4 extras) no Diagrama Principal</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {extraSeries.map(s => (
                          <div key={s.key} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                            <input type="checkbox" checked={s.active} onChange={e => handleUpdateExtraSeries(s.key, 'active', e.target.checked)} className="w-4 h-4 accent-indigo-600 cursor-pointer"/>
                            <input type="text" value={s.label} onChange={e => handleUpdateExtraSeries(s.key, 'label', e.target.value)} className="flex-1 text-sm font-bold border-b border-slate-100 outline-none focus:border-indigo-500 bg-transparent disabled:opacity-50" placeholder="Nome da Série" disabled={!s.active} />
                            <select value={s.type} onChange={e => handleUpdateExtraSeries(s.key, 'type', e.target.value)} className="text-xs font-bold outline-none bg-slate-50 border border-slate-100 rounded px-2 py-1 disabled:opacity-50 cursor-pointer" disabled={!s.active}>
                              <option value="line">Linha</option>
                              <option value="bar">Barra</option>
                            </select>
                            <input type="color" value={s.color} onChange={e => handleUpdateExtraSeries(s.key, 'color', e.target.value)} className="w-8 h-8 rounded cursor-pointer border-none p-0 disabled:opacity-50" disabled={!s.active} />
                          </div>
                        ))}
                      </div>
                  </div>

                  <div className="space-y-6 bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-inner">
                      <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 border-b border-slate-100 pb-2">Controle de Eixos</h4>
                      <div className="space-y-4">
                        <label className="flex items-center justify-between cursor-pointer"><span className="text-sm font-bold text-slate-700">Eixo Y Automático (Min/Max calc)</span><input type="checkbox" checked={chartConfig1.eixoYAuto} onChange={() => setChartConfig1({...chartConfig1, eixoYAuto: !chartConfig1.eixoYAuto})} className="w-4 h-4 accent-indigo-600"/></label>
                        {!chartConfig1.eixoYAuto && (
                          <div className="flex items-center gap-4 pt-2">
                            <div className="flex-1"><label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Y Mínimo</label><input type="number" value={chartConfig1.eixoYMin} onChange={e=>setChartConfig1({...chartConfig1, eixoYMin: Number(e.target.value)})} className="w-full p-2 border border-slate-200 rounded-lg text-sm outline-none"/></div>
                            <div className="flex-1"><label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Y Máximo</label><input type="number" value={chartConfig1.eixoYMax} onChange={e=>setChartConfig1({...chartConfig1, eixoYMax: Number(e.target.value)})} className="w-full p-2 border border-slate-200 rounded-lg text-sm outline-none"/></div>
                          </div>
                        )}
                      </div>
                      <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 border-b border-slate-100 pb-2 pt-4">Elementos Analíticos</h4>
                      <div className="space-y-3">
                        <label className="flex items-center justify-between cursor-pointer hover:bg-slate-100 p-1.5 rounded"><span className="text-sm font-medium text-slate-700">Rótulos de Dados nos Pontos</span><input type="checkbox" checked={chartConfig1.mostrarRotulos} onChange={() => setChartConfig1({...chartConfig1, mostrarRotulos: !chartConfig1.mostrarRotulos})} className="w-4 h-4 accent-indigo-600"/></label>
                      </div>
                  </div>

                  <div className="space-y-6 bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-inner">
                      <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 border-b border-slate-100 pb-2">Linha de Meta Geral</h4>
                      <div className="space-y-4">
                        <div className="flex items-center gap-4">
                          <div className="flex-1"><label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Valor Meta</label><input type="number" value={metaStyle.valor} onChange={e=>setMetaStyle({...metaStyle, valor: Number(e.target.value)})} className="w-full p-2 border border-slate-200 rounded-lg text-sm font-bold text-indigo-700 outline-none"/></div>
                          <div className="flex-1"><label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Rótulo</label><input type="text" value={metaStyle.rotulo} onChange={e=>setMetaStyle({...metaStyle, rotulo: e.target.value})} className="w-full p-2 border border-slate-200 rounded-lg text-sm outline-none"/></div>
                        </div>
                      </div>
                  </div>
                </div>
                
              </div>
            )}

            {/* TAB 4: ESTRUTURA DO INDICADOR (METADADOS) */}
            {activeTab === 'config_kpi' && (
              <div className="animate-in fade-in max-w-3xl space-y-6">
                  <SectionTitle title="Mapeamento Estrutural do KPI" subtitle="Defina o comportamento lógico e os metadados do indicador" />
                  <div className="bg-white border border-slate-100 rounded-2xl p-8 shadow-sm grid grid-cols-2 gap-6">
                    <div className="col-span-2">
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Nome do Indicador</label>
                      <input type="text" value={kpiConfig1.nome || ""} onChange={e=>setKpiConfig1({...kpiConfig1, nome: e.target.value})} placeholder="Nome do Indicador" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Tipo de Formatação</label>
                      <select value={kpiConfig1.formato} onChange={e=>setKpiConfig1({...kpiConfig1, formato: e.target.value})} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500 bg-white">
                          <option value="absoluto">Número Absoluto (Ex: 150)</option>
                          <option value="percentual">Percentual (Ex: 95.5%)</option>
                          <option value="moeda">Moeda (Ex: R$ 1.500,00)</option>
                          <option value="tempo">Horas (Ex: 12.5h)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Casas Decimais</label>
                      <select value={kpiConfig1.decimais} onChange={e=>setKpiConfig1({...kpiConfig1, decimais: Number(e.target.value)})} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500 bg-white">
                          <option value={0}>0 (Inteiro)</option>
                          <option value={1}>1 (Ex: 0.0)</option>
                          <option value={2}>2 (Ex: 0.00)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Polaridade (Comportamento Ideal)</label>
                      <select value={kpiConfig1.polaridade || "Maior Melhor"} onChange={e=>setKpiConfig1({...kpiConfig1, polaridade: e.target.value})} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500 bg-white">
                          <option>Maior Melhor</option><option>Menor Melhor</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Setor Vinculado</label>
                      <input type="text" value={kpiConfig1.setor || ""} placeholder="Setor" disabled className="w-full px-4 py-2.5 border border-slate-100 bg-slate-50 rounded-xl text-sm font-bold text-slate-500 outline-none" />
                    </div>
                  </div>
                  <div className="flex justify-end pt-4"><button className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl text-sm hover:bg-indigo-700 transition-all shadow-md"><Save className="w-4 h-4" /> Salvar Estrutura</button></div>
              </div>
            )}

            {/* TAB 5: ANÁLISE CRÍTICA / CAPA */}
            {activeTab === 'capa' && (
              <div className="animate-in fade-in duration-300 w-full">
                  {capaView === 'list' && (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center">
                        <SectionTitle title="Análises Críticas" subtitle="Histórico de análises de desempenho e planos de ação (CAPA)" />
                        <button onClick={() => setCapaView('detail')} className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md hover:bg-indigo-700 transition-colors">
                          <Plus className="w-4 h-4" /> Registrar Nova Análise
                        </button>
                      </div>

                      <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm bg-white">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                          <thead className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase font-black text-slate-400 tracking-widest">
                            <tr>
                              <th className="px-6 py-4">Período</th>
                              <th className="px-6 py-4">Resultado</th>
                              <th className="px-6 py-4 text-center">Status</th>
                              <th className="px-6 py-4">Responsável</th>
                              <th className="px-6 py-4 text-center">Ações CAPA</th>
                              <th className="px-6 py-4 text-center"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {MOCK_ANALISES.length === 0 ? (
                               <tr><td colSpan={6} className="text-center p-8 text-slate-400 font-bold">Nenhuma análise registrada.</td></tr>
                            ) : MOCK_ANALISES.map((a, idx) => (
                              <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                                <td className="px-6 py-4 font-bold text-slate-800">{a.periodo}</td>
                                <td className="px-6 py-4 font-medium text-slate-600">{a.resultado}% (Meta: {a.meta}%)</td>
                                <td className="px-6 py-4 text-center"><span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-red-50 text-red-600 border border-red-100">{a.status}</span></td>
                                <td className="px-6 py-4 font-medium text-slate-600">{a.autor} <span className="text-[10px] text-slate-400 block">{a.data}</span></td>
                                <td className="px-6 py-4 text-center"><span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-md text-[11px] font-bold border border-indigo-100">{a.acoes} Ações Abertas</span></td>
                                <td className="px-6 py-4 text-center">
                                  <button onClick={() => setCapaView('detail')} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-500 shadow-sm flex items-center gap-1 mx-auto group-hover:text-indigo-600 group-hover:border-indigo-200 transition-all">
                                    <Eye className="w-3.5 h-3.5"/> Abrir
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {capaView === 'detail' && (
                    <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                      <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
                        <button onClick={() => setCapaView('list')} className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 hover:text-indigo-600 transition-all"><ArrowLeft className="w-4 h-4"/></button>
                        <div>
                          <h3 className="text-lg font-bold text-slate-800">Nova Análise</h3>
                          <p className="text-xs text-slate-500 font-medium">Preencha a narrativa do desvio e estipule o plano de ação.</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-1 space-y-6">
                            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-inner">
                              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Contexto do Período</h4>
                              <div className="space-y-4">
                                <div><p className="text-xs text-slate-400 font-medium">Valor Realizado</p><p className="text-2xl font-black text-[#2655e8]">-</p></div>
                                <div><p className="text-xs text-slate-400 font-medium">Meta</p><p className="text-lg font-bold text-red-600">-</p></div>
                                <div><p className="text-xs text-slate-400 font-medium">Desvio Absoluto</p><p className="text-sm font-bold text-slate-700">-</p></div>
                              </div>
                            </div>
                        </div>
                        
                        <div className="md:col-span-2 space-y-6">
                            <div>
                              <label className="block text-[11px] font-black text-slate-600 uppercase tracking-widest mb-2">Narrativa da Análise Crítica</label>
                              <textarea className="w-full p-4 border border-slate-200 rounded-2xl text-sm outline-none focus:border-indigo-500 shadow-sm resize-none min-h-[120px]" placeholder="Descreva os fatores que levaram ao resultado..."></textarea>
                            </div>
                            
                            <div>
                              <div className="flex justify-between items-center mb-3">
                                <label className="block text-[11px] font-black text-slate-600 uppercase tracking-widest">Plano de Ação (CAPA)</label>
                                <button className="text-xs font-bold text-indigo-600 flex items-center gap-1 hover:text-indigo-800"><PlusCircle className="w-3.5 h-3.5"/> Adicionar Ação</button>
                              </div>
                              <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                                <table className="w-full text-left text-sm">
                                  <thead className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase font-black text-slate-400 tracking-widest">
                                    <tr><th className="px-4 py-3">O que fazer? (Ação)</th><th className="px-4 py-3">Quem?</th><th className="px-4 py-3">Prazo</th><th className="px-4 py-3"></th></tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-50">
                                    <tr className="bg-white">
                                      <td className="px-4 py-3"><input type="text" placeholder="Descreva a ação corretiva..." className="w-full text-sm outline-none font-medium text-slate-700"/></td>
                                      <td className="px-4 py-3"><select className="text-sm outline-none bg-transparent font-medium text-slate-600"><option>Responsável</option></select></td>
                                      <td className="px-4 py-3"><input type="date" className="text-sm outline-none font-medium text-slate-600"/></td>
                                      <td className="px-4 py-3 text-right"><button className="text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4"/></button></td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            <div className="flex justify-end pt-4">
                              <button className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl text-sm shadow-md hover:bg-indigo-700 transition-all flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/> Salvar Análise e CAPA</button>
                            </div>
                        </div>
                      </div>
                    </div>
                  )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PÁGINA PRINCIPAL DO MÓDULO (A VIEW INICIAL COM A LISTAGEM) ──────────────
export default function GestaoIndicadoresPage() {
  const [tab, setTab] = useState("painel");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string[]>([]);
  const [indicadorAtivo, setIndicadorAtivo] = useState<any>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return ALL_INDICATORS.filter(i => i.nome.toLowerCase().includes(q) || i.id.toLowerCase().includes(q) || i.setor.toLowerCase().includes(q));
  }, [search]);

  const sectors = useMemo(() => SETORES.map(s => {
    const inds = filtered.filter(i => i.setor === s.nome);
    const v = inds.filter(i => i.status === "verde").length;
    const a = inds.filter(i => i.status === "amarelo").length;
    const r = inds.filter(i => i.status === "vermelho").length;
    return {...s, inds, verde: v, amarelo: a, vermelho: r, total: inds.length};
  }).filter(s => s.total > 0), [filtered]);

  const stats = useMemo(() => ({
    total: ALL_INDICATORS.length,
    red: ALL_INDICATORS.filter(i => i.status === "vermelho").length,
    yellow: ALL_INDICATORS.filter(i => i.status === "amarelo").length,
    openActions: MOCK_ACOES.length,
    pct: ALL_INDICATORS.length > 0 ? Math.round(ALL_INDICATORS.filter(i => i.status === "verde").length / ALL_INDICATORS.length * 100) : 0
  }), []);

  if (indicadorAtivo) {
    return <IndicadorDetailView ind={indicadorAtivo} onBack={() => setIndicadorAtivo(null)} />;
  }

  return (
    <div className="w-full h-full bg-slate-50/50 p-6 md:p-8 flex flex-col animate-in fade-in duration-500">
      <div className="w-full max-w-7xl mx-auto flex flex-col h-full gap-6">
        <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 shrink-0 w-full">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">Gestão de Indicadores <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase rounded-md border border-indigo-200">KPIs & BSC</span></h1>
            <p className="text-sm text-slate-500 mt-1 font-medium">Monitoramento de performance em tempo real · <strong className="text-slate-700">{stats.total} KPIs ativos</strong></p>
          </div>
          <div className="relative group w-full md:w-auto mt-2 md:mt-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={search} onChange={e => { setSearch(e.target.value); setTab("painel"); }} placeholder="Buscar indicador..." className="pl-10 pr-10 py-2.5 text-sm font-medium bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-400 w-full md:w-80 shadow-sm transition-all"/>
            {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2"><XCircle className="w-4 h-4 text-slate-300 hover:text-red-500 transition-colors" /></button>}
          </div>
        </div>

        <div className="border-b border-slate-200 flex gap-8 text-[13px] font-bold text-slate-500 overflow-x-auto shrink-0 w-full">
          {[
            { key: "painel", label: "Base de Indicadores", icon: FolderTree },
            { key: "acoes", label: "Ações CAPA", icon: Activity, badge: stats.openActions },
            { key: "cadastro", label: "Fichas Técnicas", icon: FileCheck },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`pb-4 border-b-[3px] flex items-center gap-2 whitespace-nowrap transition-all outline-none ${tab === t.key ? "border-indigo-600 text-indigo-700" : "border-transparent hover:text-slate-800 hover:border-slate-300"}`}>
              <t.icon className="w-4 h-4" /> {t.label}
              {t.badge ? <span className="ml-1 bg-red-100 text-red-600 px-1.5 py-0.5 rounded border border-red-200 text-[10px] font-black">{t.badge}</span> : null}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-hidden flex flex-col pb-4 w-full">
          {tab === "painel" && (
            <div className="flex flex-col h-full gap-6 w-full">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0 w-full">
                {[ {l: "Cadastrados", v: stats.total, c: "text-slate-800", bc: "border-slate-100 bg-white"}, {l: "Em Atenção", v: stats.yellow, c: "text-amber-600", bc: "border-amber-100 bg-white"}, {l: "Críticos", v: stats.red, c: "text-red-600", bc: "border-red-100 bg-white"}, {l: "% Result. na Meta", v: `${stats.pct}%`, c: "text-emerald-700", bc: "border-emerald-100 bg-emerald-50"} ].map(s => (
                  <div key={s.l} className={`p-5 rounded-2xl shadow-sm flex flex-col gap-2 border ${s.bc}`}><span className="text-[10px] font-black uppercase text-slate-500">{s.l}</span><span className={`text-3xl font-black ${s.c}`}>{s.v}</span></div>
                ))}
              </div>
              
              <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden flex-1 flex flex-col w-full">
                <div className="p-4 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center shrink-0">
                  <div className="flex gap-2"><button onClick={() => setExpanded(SETORES.map(s=>s.nome))} className="px-4 py-2 bg-white border border-slate-200 text-slate-500 rounded-xl text-xs font-bold hover:text-indigo-600 shadow-sm transition-all">Expandir Tudo</button><button onClick={() => setExpanded([])} className="px-4 py-2 bg-white border border-slate-200 text-slate-500 rounded-xl text-xs font-bold hover:text-indigo-600 shadow-sm transition-all">Recolher</button></div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-4 hidden sm:inline-block">Base de Dados · TreeView</span>
                </div>
                <div className="overflow-y-auto flex-1 p-2 custom-scrollbar w-full">
                  {sectors.length === 0 ? (
                     <div className="p-10 text-center text-slate-400 font-bold">Nenhum indicador cadastrado na base de dados.</div>
                  ) : sectors.map(s => (
                    <div key={s.nome} className="mb-1">
                      <button onClick={() => setExpanded(p => p.includes(s.nome) ? p.filter(x=>x!==s.nome) : [...p, s.nome])} className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all outline-none ${expanded.includes(s.nome) ? "bg-slate-50 border border-slate-100 shadow-inner" : "hover:bg-slate-50 border border-transparent"}`}>
                        <div className="flex items-center gap-4">
                          <div className="w-6 h-6 flex items-center justify-center text-slate-300">{expanded.includes(s.nome) ? <ChevronDown className="w-5 h-5 text-indigo-600" /> : <ChevronRight className="w-5 h-5 text-slate-300" />}</div>
                          <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-[10px] font-black shadow-sm shrink-0" style={{color: s.cor}}>{s.sigla}</div>
                          <span className="font-bold text-slate-800 text-base md:text-lg">{s.nome}</span>
                          <span className="text-[10px] font-bold text-slate-400 bg-white border border-slate-100 px-2 py-0.5 rounded-full hidden sm:inline-block">{s.total}</span>
                        </div>
                        <div className="flex gap-4 md:gap-6 pr-4">
                          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500"/><span className="text-xs font-bold text-slate-500">{s.vermelho}</span></div>
                          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-400"/><span className="text-xs font-bold text-slate-500">{s.amarelo}</span></div>
                          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500"/><span className="text-xs font-bold text-slate-500">{s.verde}</span></div>
                        </div>
                      </button>
                      {expanded.includes(s.nome) && (
                        <div className="mt-2 sm:ml-14 mr-2 sm:mr-4 mb-4 bg-white border border-slate-50 rounded-3xl overflow-hidden shadow-inner overflow-x-auto">
                          <table className="w-full text-left text-sm border-collapse min-w-[600px]">
                            <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">
                              <tr><th className="px-6 py-3">Código</th><th className="px-6 py-3">Indicador</th><th className="px-6 py-3 text-center">Status</th><th className="px-6 py-3 text-right">Realizado</th><th className="px-6 py-3 text-right">Meta</th><th className="px-6 py-3 text-right"></th></tr>
                            </thead>
                            <tbody>
                              {s.inds.map((ind: any) => (
                                <tr key={ind.id} onClick={() => setIndicadorAtivo(ind)} className="hover:bg-indigo-50/30 cursor-pointer group border-b last:border-0 border-slate-50">
                                  <td className="px-6 py-4 font-bold text-indigo-600 text-xs">{ind.id}</td>
                                  <td className="px-6 py-4 font-bold text-slate-800">{ind.nome} <span className="ml-2 text-[9px] font-mono bg-slate-100 text-slate-400 px-1 py-0.5 rounded border border-slate-100">{ind.setorSigla}</span></td>
                                  <td className="px-6 py-4 text-center"><div className="flex items-center justify-center gap-2"><div className={`w-2 h-2 rounded-full ${statusColors[ind.status]}`} /><TIcon val={ind.valorAtual} target={ind.meta} pol={ind.polaridade}/></div></td>
                                  <td className="px-6 py-4 text-right font-black text-slate-900">{formatValue(ind.valorAtual, ind.unidade === "%" ? "percentual" : "absoluto", 1)}</td>
                                  <td className="px-6 py-4 text-right font-bold text-slate-400">{ind.meta}</td>
                                  <td className="px-6 py-4 text-right"><button className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-500 shadow-sm flex items-center gap-1 ml-auto group-hover:text-indigo-600 group-hover:border-indigo-200"><BarChart3 className="w-3.5 h-3.5"/> Analisar</button></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {tab === "acoes" && (
            <div className="flex flex-col h-full bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden animate-in fade-in w-full">
                <div className="p-6 border-b border-slate-50 flex flex-col md:flex-row justify-between items-center bg-slate-50/50 gap-4 shrink-0">
                  <div><h2 className="text-lg font-bold text-slate-800 leading-none">Plano de Ação (CAPA)</h2></div>
                  <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 w-full md:w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/><input type="text" placeholder="Pesquisar ação..." className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500 w-full shadow-sm" /></div>
                    <button className="flex items-center justify-center w-full sm:w-auto gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 shadow-sm"><Plus className="w-4 h-4" /> Nova Ação</button>
                  </div>
                </div>
                <div className="overflow-y-auto flex-1 custom-scrollbar overflow-x-auto w-full">
                  <table className="w-full text-left text-sm min-w-[700px]">
                    <thead className="bg-white border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-widest sticky top-0 shadow-sm z-10">
                      <tr><th className="px-6 py-4">Ação</th><th className="px-6 py-4">KPI Ref.</th><th className="px-6 py-4">Responsável</th><th className="px-6 py-4 text-center">Prazo</th><th className="px-6 py-4 text-center">Status</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {MOCK_ACOES.length === 0 ? (
                        <tr><td colSpan={5} className="text-center p-10 text-slate-400 font-bold">Nenhum plano de ação (CAPA) em aberto.</td></tr>
                      ) : MOCK_ACOES.map(a => (
                        <tr key={a.id} className="hover:bg-slate-50 cursor-pointer group transition-colors">
                          <td className="px-6 py-4 font-bold text-slate-800">{a.desc}</td>
                          <td className="px-6 py-4"><span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded shadow-sm">{a.indicador}</span></td>
                          <td className="px-6 py-4"><div className="flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 border border-slate-200">{getInitials(a.resp)}</div><span className="font-bold text-slate-700 text-xs">{a.resp}</span></div></td>
                          <td className="px-6 py-4 text-center text-xs font-bold text-slate-500">{a.prazo}</td>
                          <td className="px-6 py-4 text-center"><span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border shadow-sm ${a.status==='Concluída'?'bg-emerald-50 text-emerald-700 border-emerald-100':'bg-indigo-50 text-indigo-700 border-indigo-100'}`}>{a.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
            </div>
          )}

          {tab === "cadastro" && (
            <div className="flex flex-col h-full animate-in fade-in w-full">
                <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 shrink-0 gap-4">
                  <div><h2 className="text-xl font-bold text-slate-800">Mapeamento de Indicadores</h2><p className="text-sm text-slate-500">Repositório de Fichas Técnicas aprovadas.</p></div>
                  <button className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-md hover:bg-indigo-700 transition-all"><Plus className="w-4 h-4" /> Cadastrar Ficha</button>
                </div>
                <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden flex-1 flex flex-col w-full">
                  <div className="overflow-y-auto flex-1 custom-scrollbar overflow-x-auto w-full">
                    <table className="w-full text-left text-sm min-w-[700px]">
                      <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-widest sticky top-0 shadow-sm z-10">
                          <tr><th className="px-6 py-4">Ficha</th><th className="px-6 py-4">Título do KPI</th><th className="px-6 py-4">Setor</th><th className="px-6 py-4 text-center">Rev.</th><th className="px-6 py-4 text-center">Status</th><th className="px-6 py-4"></th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                          {MOCK_FICHAS.length === 0 ? (
                            <tr><td colSpan={6} className="text-center p-10 text-slate-400 font-bold">Nenhuma ficha técnica cadastrada.</td></tr>
                          ) : MOCK_FICHAS.map(f => (
                            <tr key={f.id} className="hover:bg-slate-50 transition-colors group">
                              <td className="px-6 py-4 font-mono font-bold text-indigo-700">{f.id}</td>
                              <td className="px-6 py-4 font-bold text-slate-800">{f.titulo}<span className="bg-slate-100 text-slate-400 font-mono text-[9px] px-1.5 py-0.5 rounded border border-slate-200 ml-2">{f.codigo}</span></td>
                              <td className="px-6 py-4 text-slate-500 font-medium">{f.setor}</td>
                              <td className="px-6 py-4 text-center text-slate-400 font-black">{f.rev}</td>
                              <td className="px-6 py-4 text-center"><span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border ${f.status === 'Repositório' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>{f.status}</span></td>
                              <td className="px-6 py-4 text-right"><button className="text-xs font-bold text-slate-400 hover:text-indigo-600 flex items-center gap-1 ml-auto">Ver Ficha <ChevronRight className="w-4 h-4"/></button></td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}