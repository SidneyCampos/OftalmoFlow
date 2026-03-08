// src/App.jsx
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

  function go(path) {
    navigate(path);

    const closeBtn = document.getElementById("mobileMenuClose");
    if (closeBtn) {
      setTimeout(() => closeBtn.click(), 0);
    }
  }

  return (
    <div
      className="d-flex flex-column flex-md-row"
      style={{ minHeight: "100vh" }}
    >
      {/* MOBILE */}
      <nav
        className="navbar app-sidebar d-md-none px-2"
        style={{ minHeight: 52 }}
      >
        <div className="d-flex align-items-center gap-2">
          <button
            className="btn sidebar-btn btn-sm"
            type="button"
            data-bs-toggle="offcanvas"
            data-bs-target="#mobileMenu"
          >
            ☰
          </button>

          <div>
            <div className="fw-bold" style={{ fontSize: 16 }}>
              CREOI
            </div>

            <div className="text-secondary" style={{ fontSize: 11 }}>
              Centro de Referência em Oftalmologia de Iguatama
            </div>
          </div>
        </div>
      </nav>

      {/* DESKTOP */}
      <aside
        className="app-sidebar p-3 d-none d-md-block"
        style={{ width: 260 }}
      >
        <div className="mb-4">
          <div className="fw-bold fs-4">CREOI</div>

          <div className="text-secondary" style={{ fontSize: 12 }}>
            Centro de Referência em Oftalmologia de Iguatama
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

      {/* MENU MOBILE */}
      <div
        className="offcanvas offcanvas-start app-sidebar d-md-none"
        id="mobileMenu"
      >
        <div className="offcanvas-header">
          <div>
            <div className="fw-bold">CREOI</div>

            <div className="text-secondary" style={{ fontSize: 12 }}>
              Centro de Referência em Oftalmologia de Iguatama
            </div>
          </div>

          <button
            id="mobileMenuClose"
            type="button"
            className="btn-close btn-close-white"
            data-bs-dismiss="offcanvas"
          />
        </div>

        <div className="offcanvas-body">
          <button className="btn nav-btn" onClick={() => go("/")}>
            Recepção
          </button>

          <button className="btn nav-btn" onClick={() => go("/medico")}>
            Médico
          </button>

          <button className="btn nav-btn" onClick={() => go("/dashboard")}>
            Dashboard
          </button>
        </div>
      </div>

      <main className="flex-grow-1 p-2 p-md-4">
        <Routes>
          <Route path="/" element={<Recepcao />} />
          <Route path="/medico" element={<Medico />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </main>
    </div>
  );
}
