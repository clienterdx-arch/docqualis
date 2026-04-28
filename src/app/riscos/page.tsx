"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ShieldAlert, Target, Activity, Plus, Search,
  AlertTriangle, CheckCircle2, AlertCircle,
  FileSpreadsheet, X, Loader2, Trash2, Save
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

/* ─────────────────────────────────────────────────────────────────
 * TIPOS
 * ───────────────────────────────────────────────────────────────*/
interface Risco {
  id: string;
  empresa_id: string;
  codigo: string;
  titulo: string;
  descricao: string;
  categoria: string;
  processo_vinculado: string;
  setor: string;
  responsavel: string;
  probabilidade: number;
  impacto: number;
  nivel_risco: number;
  score: number;
  classificacao: string;
  status: string;
  estrategia: string;
  plano_tratamento: string;
  controles_existentes: string;
  prazo_tratamento: string;
  data_avaliacao: string;
}

/* ─────────────────────────────────────────────────────────────────
 * HELPERS
 * ───────────────────────────────────────────────────────────────*/
function calcScore(prob: number, imp: number) {
  return prob * imp;
}

function getRiskLabel(score: number) {
  if (score <= 4)  return { label: "Baixo", color: "text-emerald-600 bg-emerald-50" };
  if (score <= 9)  return { label: "Moderado", color: "text-amber-600 bg-amber-50" };
  if (score <= 14) return { label: "Alto", color: "text-orange-600 bg-orange-50" };
  if (score <= 19) return { label: "Muito Alto", color: "text-red-600 bg-red-50" };
  return { label: "Extremo", color: "text-purple-600 bg-purple-50" };
}

/* ─────────────────────────────────────────────────────────────────
 * COMPONENTE PRINCIPAL
 * ───────────────────────────────────────────────────────────────*/
export default function GestaoRiscosPage() {
  const router = useRouter();

  const [riscos, setRiscos] = useState<Risco[]>([]);
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [riscoSelecionado, setRiscoSelecionado] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  /* ── SESSÃO ─────────────────────────────────────────────── */
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }

      const { data: perfis } = await supabase
        .from("perfis")
        .select("empresa_id")
        .eq("id", session.user.id)
        .limit(1);

      const perfil = perfis?.[0];
      if (perfil?.empresa_id) setEmpresaId(perfil.empresa_id);
      else setIsLoading(false);
    };

    init();
  }, [router]);

  /* ── FETCH ─────────────────────────────────────────────── */
  const fetchRiscos = useCallback(async () => {
    if (!empresaId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data } = await supabase
        .from("riscos")
        .select("*")
        .eq("empresa_id", empresaId);

      const dataComScore = (data ?? []).map((r: Risco) => ({
        ...r,
        score: r.nivel_risco ?? calcScore(r.probabilidade, r.impacto),
      }));

      setRiscos(dataComScore);
    } finally {
      setIsLoading(false);
    }
  }, [empresaId]);

  useEffect(() => {
    fetchRiscos();
  }, [fetchRiscos]);

  /* ─────────────────────────────────────────────────────────
   * RENDER
   * ───────────────────────────────────────────────────────*/
  if (isLoading) {
    return (
      <div className="p-20 text-center">
        <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-8">

      <h1 className="text-2xl font-bold mb-6">
        Gestão de Riscos
      </h1>

      {riscos.map((risco) => (
        <div
          key={risco.id}
          className="border p-4 mb-3 rounded-xl cursor-pointer"
          onClick={() => setRiscoSelecionado(risco)}
        >
          <div className="flex justify-between">
            <span className="font-bold">{risco.codigo}</span>

            <span className={`px-2 py-1 text-xs rounded ${getRiskLabel(risco.score).color}`}>
              {risco.score} — {getRiskLabel(risco.score).label}
            </span>
          </div>

          <p className="mt-2 font-semibold">{risco.titulo}</p>
        </div>
      ))}

      {/* DETALHE */}
      {riscoSelecionado && (
        <div className="mt-6 p-4 border rounded-xl bg-white">
          <div className="flex justify-between mb-2">
            <strong>{riscoSelecionado.codigo}</strong>

            <span className={`px-2 py-1 text-xs rounded ${getRiskLabel(riscoSelecionado.score).color}`}>
              {riscoSelecionado.score}
            </span>
          </div>

          <h2 className="font-bold text-lg">
            {riscoSelecionado.titulo}
          </h2>

          <p className="text-sm mt-2 text-slate-600">
            {riscoSelecionado.descricao}
          </p>

          <button
            onClick={() => setRiscoSelecionado(null)}
            className="mt-4 text-red-500"
          >
            Fechar
          </button>
        </div>
      )}

    </div>
  );
}
