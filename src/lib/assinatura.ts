import { supabase } from "@/lib/supabase";

const HASH_ITERATIONS = 120000;

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function secureCompare(a: string, b: string): boolean {
  const aBytes = fromBase64(a);
  const bBytes = fromBase64(b);
  if (aBytes.length !== bBytes.length) return false;

  let diff = 0;
  for (let index = 0; index < aBytes.length; index += 1) {
    diff |= aBytes[index] ^ bBytes[index];
  }
  return diff === 0;
}

function createSalt(): string {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  return toBase64(salt);
}

async function deriveSignatureHash(secret: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: encoder.encode(salt),
      iterations: HASH_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );

  return toBase64(new Uint8Array(bits));
}

export async function validarAssinaturaEletronica(secret: string) {
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;

  if (!session?.user?.email) {
    return { ok: false, message: "Sessão expirada. Entre novamente para assinar." };
  }

  const { data: userData } = await supabase.auth.getUser();
  const metadata = userData.user?.user_metadata ?? session.user.user_metadata ?? {};
  const hash = metadata.assinatura_pin_hash as string | undefined;
  const salt = metadata.assinatura_pin_salt as string | undefined;

  if (hash && salt) {
    const candidate = await deriveSignatureHash(secret, salt);
    return secureCompare(candidate, hash)
      ? { ok: true, mode: "pin" as const }
      : { ok: false, message: "PIN de assinatura inválido." };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: session.user.email,
    password: secret,
  });

  return error
    ? { ok: false, message: "Assinatura inválida. Senha incorreta." }
    : { ok: true, mode: "password" as const };
}

export async function salvarPinAssinatura(pin: string, senhaAtual: string) {
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;

  if (!session?.user?.email) {
    return { ok: false, message: "Sessão expirada. Entre novamente para configurar o PIN." };
  }

  const { error: authError } = await supabase.auth.signInWithPassword({
    email: session.user.email,
    password: senhaAtual,
  });

  if (authError) {
    return { ok: false, message: "Senha atual incorreta. O PIN não foi alterado." };
  }

  const salt = createSalt();
  const hash = await deriveSignatureHash(pin, salt);
  const { error } = await supabase.auth.updateUser({
    data: {
      assinatura_pin_hash: hash,
      assinatura_pin_salt: salt,
      assinatura_pin_alg: `PBKDF2-SHA256-${HASH_ITERATIONS}`,
      assinatura_pin_updated_at: new Date().toISOString(),
    },
  });

  return error
    ? { ok: false, message: error.message }
    : { ok: true, message: "PIN de assinatura atualizado." };
}
