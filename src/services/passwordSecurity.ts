import { validarPoliticaPassword } from './domainRules';

const PBKDF2_PREFIX = '$pbkdf2-sha256$';
const PBKDF2_ITERATIONS = 10000;
const SALT_BYTES = 16;

// Constantes estándar SHA-256 (FIPS 180-4)
const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function sha256Bytes(data: Uint8Array): Uint8Array {
  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const bitLen = data.length * 8;
  const padLen = ((data.length + 9 + 63) & ~63);
  const padded = new Uint8Array(padLen);
  padded.set(data);
  padded[data.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padLen - 8, Math.floor(bitLen / 0x100000000), false);
  view.setUint32(padLen - 4, bitLen >>> 0, false);

  const w = new Uint32Array(64);

  for (let offset = 0; offset < padLen; offset += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i++) {
      const v15 = w[i - 15];
      const s0 = ((v15 >>> 7) | (v15 << 25)) ^ ((v15 >>> 18) | (v15 << 14)) ^ (v15 >>> 3);
      const v2 = w[i - 2];
      const s1 = ((v2 >>> 17) | (v2 << 15)) ^ ((v2 >>> 19) | (v2 << 13)) ^ (v2 >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let i = 0; i < 64; i++) {
      const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + SHA256_K[i] + w[i]) >>> 0;
      const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  outView.setUint32(0, h0, false);
  outView.setUint32(4, h1, false);
  outView.setUint32(8, h2, false);
  outView.setUint32(12, h3, false);
  outView.setUint32(16, h4, false);
  outView.setUint32(20, h5, false);
  outView.setUint32(24, h6, false);
  outView.setUint32(28, h7, false);
  return out;
}

function hmacSha256(key: Uint8Array, message: Uint8Array): Uint8Array {
  const blockSize = 64;
  let normalizedKey = key;
  if (normalizedKey.length > blockSize) {
    normalizedKey = sha256Bytes(normalizedKey);
  }
  const paddedKey = new Uint8Array(blockSize);
  paddedKey.set(normalizedKey);

  const oKeyPad = new Uint8Array(blockSize + 32);
  const iKeyPad = new Uint8Array(blockSize + message.length);
  for (let i = 0; i < blockSize; i++) {
    oKeyPad[i] = paddedKey[i] ^ 0x5c;
    iKeyPad[i] = paddedKey[i] ^ 0x36;
  }
  iKeyPad.set(message, blockSize);
  const innerHash = sha256Bytes(iKeyPad);
  oKeyPad.set(innerHash, blockSize);
  return sha256Bytes(oKeyPad);
}

function pbkdf2HmacSha256(passwordBytes: Uint8Array, salt: Uint8Array, iterations: number): Uint8Array {
  const saltBlock = new Uint8Array(salt.length + 4);
  saltBlock.set(salt);
  saltBlock[salt.length] = 0;
  saltBlock[salt.length + 1] = 0;
  saltBlock[salt.length + 2] = 0;
  saltBlock[salt.length + 3] = 1;

  let u = hmacSha256(passwordBytes, saltBlock);
  const T = new Uint8Array(u);

  for (let i = 1; i < iterations; i++) {
    u = hmacSha256(passwordBytes, u);
    for (let j = 0; j < 32; j++) {
      T[j] ^= u[j];
    }
  }
  return T;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBytes(hex: string): Uint8Array | null {
  if (hex.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(hex)) return null;
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function generateSalt(length = SALT_BYTES): Uint8Array {
  const salt = new Uint8Array(length);
  if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(salt);
    return salt;
  }
  for (let i = 0; i < length; i++) {
    salt[i] = Math.floor(Math.random() * 256);
  }
  return salt;
}

function timingSafeEqualBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

export function esPasswordHasheada(stored: string): boolean {
  return typeof stored === 'string' && stored.startsWith(PBKDF2_PREFIX);
}

/**
 * Calcula el hash criptográfico SHA-256 real (64 caracteres hexadecimales, FIPS 180-4)
 * sobre un arreglo de bytes o cadena (por ejemplo, dataUrl o contenido binario de evidencia).
 */
export function calcularHashSha256(input: Uint8Array | string): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  return bytesToHex(sha256Bytes(bytes));
}

/**
 * Genera un hash criptográfico robusto (PBKDF2-HMAC-SHA256 con sal aleatoria de 128 bits y 10.000 iteraciones).
 * Nunca almacena la contraseña en texto plano.
 */
export function hashPassword(plainPassword: string): string {
  const encoder = new TextEncoder();
  const passwordBytes = encoder.encode(plainPassword);
  const salt = generateSalt(SALT_BYTES);
  const derived = pbkdf2HmacSha256(passwordBytes, salt, PBKDF2_ITERATIONS);
  return `${PBKDF2_PREFIX}${PBKDF2_ITERATIONS}$${bytesToHex(salt)}$${bytesToHex(derived)}`;
}

/**
 * Verifica una contraseña contra el valor almacenado:
 * - Si el valor almacenado es un hash PBKDF2-HMAC-SHA256 ($pbkdf2-sha256$...), deriva la clave con su sal y compara en tiempo constante.
 * - Si es un registro semilla heredado sin prefijo de hash, mantiene compatibilidad de lectura sin modificar cuentas existentes.
 */
export function verifyPassword(plainPassword: string, storedPassword: string): boolean {
  if (!plainPassword || !storedPassword) return false;
  if (esPasswordHasheada(storedPassword)) {
    const rest = storedPassword.slice(PBKDF2_PREFIX.length);
    const parts = rest.split('$');
    if (parts.length !== 3) return false;
    const iterations = Number(parts[0]);
    const salt = hexToBytes(parts[1]);
    const expectedHash = hexToBytes(parts[2]);
    if (!Number.isInteger(iterations) || iterations < 1000 || !salt || !expectedHash) {
      return false;
    }
    const encoder = new TextEncoder();
    const derived = pbkdf2HmacSha256(encoder.encode(plainPassword), salt, iterations);
    return timingSafeEqualBytes(derived, expectedHash);
  }
  return storedPassword === plainPassword;
}

export interface RegistroInput {
  nombres?: unknown;
  apellidos?: unknown;
  documento?: unknown;
  correo?: unknown;
  password?: unknown;
}

export type CampoRegistro = 'nombres' | 'apellidos' | 'documento' | 'correo' | 'password';

export interface ResultadoValidacionRegistro {
  ok: boolean;
  error?: string;
  campo?: CampoRegistro;
  erroresPorCampo: Partial<Record<CampoRegistro, string>>;
  datos?: {
    nombres: string;
    apellidos: string;
    documento: string;
    correo: string;
    password: string;
  };
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Valida los datos de registro tanto en cliente como en servidor,
 * devolviendo errores claros por campo y un mensaje general comprensible.
 */
export function validarDatosRegistro(input: RegistroInput): ResultadoValidacionRegistro {
  const nombres = typeof input.nombres === 'string' ? input.nombres.trim() : '';
  const apellidos = typeof input.apellidos === 'string' ? input.apellidos.trim() : '';
  const documento = typeof input.documento === 'string' ? input.documento.trim() : '';
  const correo = typeof input.correo === 'string' ? input.correo.trim().toLowerCase() : '';
  const password = typeof input.password === 'string' ? input.password : '';

  const erroresPorCampo: Partial<Record<CampoRegistro, string>> = {};

  if (!nombres) {
    erroresPorCampo.nombres = 'Ingrese su nombre.';
  } else if (nombres.length < 2) {
    erroresPorCampo.nombres = 'El nombre debe tener al menos 2 caracteres.';
  }

  if (!apellidos) {
    erroresPorCampo.apellidos = 'Ingrese sus apellidos.';
  } else if (apellidos.length < 2) {
    erroresPorCampo.apellidos = 'Los apellidos deben tener al menos 2 caracteres.';
  }

  if (!documento) {
    erroresPorCampo.documento = 'Ingrese su documento de identidad.';
  } else if (documento.length < 4) {
    erroresPorCampo.documento = 'El documento de identidad debe tener al menos 4 caracteres.';
  }

  if (!correo) {
    erroresPorCampo.correo = 'Ingrese su correo electrónico.';
  } else if (!EMAIL_REGEX.test(correo)) {
    erroresPorCampo.correo = 'Ingrese un correo electrónico válido (ejemplo: nombre@empresa.com).';
  }

  if (!password) {
    erroresPorCampo.password = 'Ingrese una contraseña.';
  } else {
    const errPolitica = validarPoliticaPassword(password);
    if (errPolitica) {
      erroresPorCampo.password = errPolitica;
    }
  }

  const ordenCampos: CampoRegistro[] = ['nombres', 'apellidos', 'documento', 'correo', 'password'];
  const primerCampoConError = ordenCampos.find((c) => Boolean(erroresPorCampo[c]));

  if (primerCampoConError) {
    return {
      ok: false,
      campo: primerCampoConError,
      error: erroresPorCampo[primerCampoConError],
      erroresPorCampo,
    };
  }

  return {
    ok: true,
    erroresPorCampo: {},
    datos: {
      nombres,
      apellidos,
      documento,
      correo,
      password,
    },
  };
}
