export type StatusCadastro = "ativo" | "inativo";
export type StatusUsuario = "ativo" | "inativo" | "bloqueado";
export type NivelPermissao = "sem_acesso" | "visualizar" | "editar" | "aprovar" | "administrar";

export const MODULOS_SISTEMA = [
  "Gestão de Documentos",
  "Gestão de Processos",
  "Gestão de Riscos",
  "Ocorrências & Eventos",
  "Gestão de Registros",
  "Gestão de Indicadores",
  "Planej. Estratégico",
  "Configurações",
] as const;

export type ModuloSistema = (typeof MODULOS_SISTEMA)[number];

export interface Diretoria {
  id: string;
  empresa_id: string;
  codigo: string;
  nome: string;
  descricao: string;
  responsavel: string;
  qtd_setores: number;
  status: StatusCadastro;
  created_at: string;
}

export interface Setor {
  id: string;
  empresa_id: string;
  diretoria_id: string;
  diretoria_nome: string;
  codigo: string;
  nome: string;
  descricao: string;
  responsavel: string;
  status: StatusCadastro;
  created_at: string;
}

export interface CategoriaDocumento {
  id: string;
  empresa_id: string;
  nome: string;
  sigla: string;
  descricao: string;
  cor: string;
  status: StatusCadastro;
  created_at: string;
}

export interface UsuarioCadastro {
  id: string;
  empresa_id: string;
  nome: string;
  email: string;
  cargo: string;
  setor: string;
  setor_id: string;
  diretoria: string;
  diretoria_id: string;
  perfil: string;
  status: StatusUsuario;
  permissoes: Record<ModuloSistema, NivelPermissao>;
  ultimo_login?: string;
  created_at: string;
}
