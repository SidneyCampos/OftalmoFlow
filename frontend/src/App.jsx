// src/App.jsx
// “Casca” do sistema: menu lateral + rotas (Recepção / Médico)
import React from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  useNavigate,
} from "react-router-dom";
import Recepcao from "./pages/Recepcao";
import Medico from "./pages/Medico";
import Dashboard from "./pages/Dashboard";

export default function App() {
  return (
    <BrowserRouter>
      <Shell />
    </BrowserRouter>
  );
}

function Shell() {
  const navigate = useNavigate();

  // Em alguns setups o atributo data-bs-dismiss em <a> pode bloquear a navegação do React Router.
  // Então, no mobile, a gente navega via JS e fecha o Offcanvas clicando no botão de fechar.
  function go(path) {
    navigate(path);

    // Fecha o menu mobile se estiver aberto
    const closeBtn = document.getElementById("mobileMenuClose");
    if (closeBtn) {
      // pequeno delay pra deixar o Router aplicar a navegação primeiro
      setTimeout(() => closeBtn.click(), 0);
    }
  }

  return (
    <div className="d-flex flex-column flex-md-row" style={{ minHeight: "100vh" }}>
      {/* Barra superior (somente mobile) */}
      <nav className="navbar app-sidebar d-md-none px-2" style={{ minHeight: 52 }}>
        <div className="d-flex align-items-center gap-2" style={{ minWidth: 0 }}>
          <button
            className="btn sidebar-btn btn-sm"
            type="button"
            data-bs-toggle="offcanvas"
            data-bs-target="#mobileMenu"
            aria-controls="mobileMenu"
            aria-label="Abrir menu"
          >
            ☰
          </button>

          <div style={{ minWidth: 0 }}>
            <div className="fw-bold" style={{ fontSize: 16, lineHeight: 1.1 }}>
              OftalmoFlow
            </div>
            <div className="text-secondary" style={{ fontSize: 12 }}>
              v1.0
            </div>
          </div>
        </div>
      </nav>

      {/* Sidebar desktop (fica igual, mas some no mobile) */}
      <aside
        className="app-sidebar p-3 d-none d-md-block"
        style={{ width: 260, flexShrink: 0 }}
      >
        <div className="mb-4">
          <div className="fw-bold fs-4">OftalmoFlow</div>
          <div className="text-secondary" style={{ fontSize: 12 }}>
            v1.0
          </div>
        </div>

        <div className="nav flex-column gap-2">
          <NavLink className="btn nav-btn" to="/">
            Recepção
          </NavLink>

          <NavLink className="btn nav-btn" to="/medico">
            Médico
          </NavLink>

          <NavLink className="btn nav-btn" to="/dashboard">
            Dashboard
          </NavLink>
        </div>
      </aside>

      {/* Menu mobile (Offcanvas do Bootstrap) */}
      <div
        className="offcanvas offcanvas-start app-sidebar d-md-none"
        tabIndex="-1"
        id="mobileMenu"
        aria-labelledby="mobileMenuLabel"
        style={{ width: "80vw", maxWidth: 320 }}
      >
        <div className="offcanvas-header">
          <div>
            <div className="fw-bold" id="mobileMenuLabel">
              OftalmoFlow
            </div>
            <div className="text-secondary" style={{ fontSize: 12 }}>
              Menu
            </div>
          </div>
          <button
            id="mobileMenuClose"
            type="button"
            className="btn-close btn-close-white"
            data-bs-dismiss="offcanvas"
            aria-label="Fechar"
          />
        </div>

        <div className="offcanvas-body">
          <div className="nav flex-column gap-2">
            <button type="button" className="btn nav-btn" onClick={() => go("/")}
            >
              Recepção
            </button>

            <button
              type="button"
              className="btn nav-btn"
              onClick={() => go("/medico")}
            >
              Médico
            </button>

            <button
              type="button"
              className="btn nav-btn"
              onClick={() => go("/dashboard")}
            >
              Dashboard
            </button>
          </div>
        </div>
      </div>

      <main
        className="flex-grow-1 p-2 p-md-4"
        style={{ minWidth: 0, overflowX: "hidden" }}
      >
        <Routes>
          <Route path="/" element={<Recepcao />} />
          <Route path="/medico" element={<Medico />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </main>
    </div>
  );
}
