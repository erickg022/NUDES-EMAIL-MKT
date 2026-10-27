# NUDES · Creador de emails

Panel para que NUDES cree los emails de collabs, eventos y lanzamientos y los pegue en Brevo.
Proyecto independiente: no toca la web eatnudes.com.

- `index.html` — el creador (formulario + vista previa + "Copiar HTML").
- `api/email-upload.js` — sube las fotos a Vercel Blob y devuelve una URL pública.
- `assets/` — logo y fotos de ejemplo.

## Puesta en marcha (una vez)
1. Vercel → Storage → crear un **Blob store** y conectarlo a este proyecto (Production y Preview).
   Esto crea sola la variable `BLOB_READ_WRITE_TOKEN`.
2. Vercel → Settings → Environment Variables → `EMAIL_BUILDER_KEY` = la clave para subir fotos.
3. Redeploy.

## Uso
Abrir la dirección del proyecto → editar → **COPIAR HTML** → Brevo: Crear campaña → Email → Pegar tu código.
