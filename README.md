# Nova CLI

CLI resmi untuk membuat dan menjalankan proyek Nova.js.

## Instalasi

```bash
npm install -g @untrustnova/nova-cli
```

## Perintah Utama

```bash
nova new <name>                # Scaffold project baru (fetch template)
nova dev                       # Jalankan backend + Vite dev server
nova build                     # Build produksi (Vite)
nova db:init                   # Drizzle generate
nova db:push                   # Drizzle push
nova create:controller <name>  # Controller baru
nova create:middleware <name>  # Middleware baru
nova create:migration <name>   # Migration baru
```

## Alur Cepat

```bash
npm install -g @untrustnova/nova-cli
nova new my-app
cd my-app
npm run dev
```

## Struktur Template

Template menggunakan:
- `nova.config.js` sebagai konfigurasi utama
- `vite.config.js` di-generate dari `nova.config.js`
- Routing hybrid (object + file-based)
- Folder `app/` untuk server-side
- Folder `web/` untuk frontend React

## Catatan

`nova new` akan mencoba fetch template dari repo `nova` dan meng-install dependency
(`@untrustnova/nova-framework` termasuk). Gunakan `--no-install` jika ingin skip instalasi,
atau set `NOVA_TEMPLATE_REPO` untuk mengganti repo template.

`nova dev` menjalankan `server.js` dan Vite dev server secara bersamaan.

Dev URLs:
- Backend API: `http://localhost:3000`
- Frontend (Vite): `http://localhost:5173`

Perintah `db:*` adalah pembungkus untuk `drizzle-kit`.
Jika belum terpasang, install: `npm install -D drizzle-kit`.
