// api/email-upload.js — Función serverless (formato Vercel).
// Recibe una imagen del creador de emails (/email-builder) y la guarda en Vercel Blob.
// Devuelve una URL pública y permanente para usarla dentro de los emails.
//
// Variables de entorno (se configuran en Vercel, NUNCA en el código):
//   EMAIL_BUILDER_KEY      → OPCIONAL. Si existe, el creador pide esta clave para subir fotos.
//                            Si no existe, solo se aceptan subidas desde la propia página del creador.
//   BLOB_READ_WRITE_TOKEN  → la crea Vercel sola al conectar un Blob store al proyecto

import { put } from '@vercel/blob';
import { timingSafeEqual } from 'node:crypto';

const TIPOS = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
const MAX_BYTES = 3 * 1024 * 1024; // el creador reduce las fotos a 800 px antes de subirlas

// Comprueba los primeros bytes para no aceptar algo que no sea una imagen real.
function esImagen(buf, tipo) {
  if (tipo === 'image/jpeg') return buf[0] === 0xff && buf[1] === 0xd8;
  if (tipo === 'image/png') return buf.subarray(0, 4).toString('hex') === '89504e47';
  if (tipo === 'image/gif') return buf.subarray(0, 3).toString() === 'GIF';
  if (tipo === 'image/webp') return buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP';
  return false;
}

function claveCorrecta(recibida) {
  const esperada = process.env.EMAIL_BUILDER_KEY || '';
  const a = Buffer.from(String(recibida || ''));
  const b = Buffer.from(esperada);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Sin clave configurada: solo se aceptan peticiones que vienen de la propia página del creador.
function mismaWeb(req) {
  const host = req.headers['x-forwarded-host'] || req.headers.host || '';
  const origen = req.headers.origin || req.headers.referer || '';
  try { return !!host && new URL(origen).host === host; } catch { return false; }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido.' });
  if (process.env.EMAIL_BUILDER_KEY) {
    if (!claveCorrecta(req.headers['x-builder-key'])) return res.status(401).json({ error: 'Clave incorrecta.' });
  } else if (!mismaWeb(req)) {
    return res.status(403).json({ error: 'Las fotos solo se pueden subir desde el creador.' });
  }

  const { name, type, data } = req.body || {};
  const ext = TIPOS[type];
  if (!ext || typeof data !== 'string') {
    return res.status(400).json({ error: 'Formato no admitido. Usa JPG, PNG, WEBP o GIF.' });
  }

  const buf = Buffer.from(data, 'base64');
  if (!buf.length || buf.length > MAX_BYTES) return res.status(413).json({ error: 'La imagen pesa más de 3 MB.' });
  if (!esImagen(buf, type)) return res.status(400).json({ error: 'El archivo no es una imagen válida.' });

  const base = String(name || 'imagen').toLowerCase()
    .replace(/\.[a-z0-9]+$/, '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'imagen';

  try {
    const blob = await put(`email/${base}.${ext}`, buf, {
      access: 'public',
      contentType: type,
      addRandomSuffix: true,
      cacheControlMaxAge: 31536000,
    });
    return res.status(200).json({ url: blob.url });
  } catch (e) {
    console.error('email-upload', e);
    return res.status(500).json({ error: 'No se pudo guardar la imagen. Inténtalo de nuevo.' });
  }
}
