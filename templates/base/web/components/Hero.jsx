import React from 'react';

export default function Hero() {
  return (
    <main className="hero">
      <div className="badge">Nova</div>
      <h1>DX bersih untuk frontend React & backend modular.</h1>
      <p>
        Mulai dari <code>nova dev</code>, lanjutkan dengan modul Storage, Cache,
        Logs, dan DB yang bisa diganti driver-nya.
      </p>
      <div className="cta">
        <button type="button">Lihat Dokumentasi</button>
        <button type="button" className="ghost">
          Buat Project
        </button>
      </div>
    </main>
  );
}
