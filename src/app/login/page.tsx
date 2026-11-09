"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

/**
 * PANTALLA DE ACCESO Y REGISTRO DE CLÍNICA
 * Lenguaje 100% orientado al usuario final (médicos, recepcionistas y directores de clínica),
 * ocultando todos los detalles técnicos internos (JWT, cookies, schemas, headers).
 */
export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [rateLimitSec, setRateLimitSec] = useState<number | null>(null);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [clinicaNombre, setClinicaNombre] = useState("");
  const [slug, setSlug] = useState("");
  const [adminNombre, setAdminNombre] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");

  function handleClinicaNombreChange(value: string) {
    setClinicaNombre(value);
    const autoSlug = value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    setSlug(autoSlug);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setRateLimitSec(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      const data = await res.json();

      if (res.status === 429) {
        const retryHeader = res.headers.get("Retry-After") || data.retryAfter || 60;
        setRateLimitSec(Number(retryHeader));
        setErrorMsg(
          "Por seguridad, hemos pausado temporalmente el acceso tras varios intentos fallidos."
        );
        return;
      }

      if (!res.ok) {
        setErrorMsg(data.message || "Correo o contraseña incorrectos.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setErrorMsg("No fue posible conectar con el servicio. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setRateLimitSec(null);

    try {
      const idempotencyKey = crypto.randomUUID();

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          clinicaNombre,
          slug,
          adminNombre,
          email: regEmail,
          password: regPassword,
        }),
      });

      const data = await res.json();

      if (res.status === 429) {
        const retryHeader = res.headers.get("Retry-After") || data.retryAfter || 60;
        setRateLimitSec(Number(retryHeader));
        setErrorMsg("Has realizado demasiadas solicitudes. Espera unos segundos.");
        return;
      }

      if (!res.ok) {
        setErrorMsg(data.message || "No se pudo completar el registro de la clínica.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setErrorMsg("No fue posible conectar con el servicio. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F4F0FA] text-[#1E162B] flex flex-col">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <span className="text-xl font-extrabold tracking-tight text-[#4E2A84]">
              korathealth
            </span>
            <span className="h-2 w-2 rounded-full bg-[#6CC24A] ml-0.5 mt-1.5"></span>
          </Link>
          <Link
            href="/"
            className="text-xs font-semibold text-[#4E2A84] hover:underline"
          >
            ← Volver al inicio
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-4xl bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden grid grid-cols-1 md:grid-cols-12">
          {/* Panel lateral institucional */}
          <div className="md:col-span-5 bg-[#2D124D] text-white p-8 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="inline-block px-3 py-1 rounded-full bg-white/10 text-[#C4F07B] text-xs font-semibold">
                Portal Médico koratOne®
              </div>
              <h2 className="text-2xl font-bold leading-snug">
                Bienvenido al espacio de trabajo de tu institución médica.
              </h2>
              <p className="text-xs text-white/80 leading-relaxed">
                Gestiona la agenda del día, consulta expedientes de pacientes y
                coordina a tu equipo de especialistas desde cualquier lugar.
              </p>
            </div>

            <div className="pt-8 border-t border-white/15 space-y-2 text-xs text-white/75">
              <div>• Historias y pacientes confidenciales</div>
              <div>• Agenda médica centralizada</div>
              <div>• Asistente de valoración pre-consulta</div>
            </div>
          </div>

          {/* Formulario limpio para el usuario */}
          <div className="md:col-span-7 p-8">
            <div className="flex border-b border-gray-200 mb-6 text-sm">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setErrorMsg(null);
                }}
                className={`pb-3 mr-6 font-bold border-b-2 transition ${
                  mode === "login"
                    ? "border-[#4E2A84] text-[#4E2A84]"
                    : "border-transparent text-gray-400 hover:text-gray-700"
                }`}
              >
                Iniciar sesión
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setErrorMsg(null);
                }}
                className={`pb-3 font-bold border-b-2 transition ${
                  mode === "register"
                    ? "border-[#4E2A84] text-[#4E2A84]"
                    : "border-transparent text-gray-400 hover:text-gray-700"
                }`}
              >
                Registrar mi clínica
              </button>
            </div>

            {errorMsg && (
              <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs">
                <div className="font-bold">Atención</div>
                <p className="mt-1">{errorMsg}</p>
                {rateLimitSec && (
                  <p className="mt-1 text-[11px] text-red-700">
                    Por favor intenta de nuevo en {rateLimitSec} segundos.
                  </p>
                )}
              </div>
            )}

            {mode === "login" ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="nombre@clinica.com"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-gray-300 text-sm text-[#1E162B] focus:outline-none focus:border-[#4E2A84]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Contraseña
                  </label>
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-gray-300 text-sm text-[#1E162B] focus:outline-none focus:border-[#4E2A84]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-full bg-[#4E2A84] hover:bg-[#3B1E66] disabled:opacity-50 text-white font-semibold text-sm transition"
                >
                  {loading ? "Ingresando al consultorio..." : "Ingresar al consultorio"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Nombre de la Clínica o Consultorio
                  </label>
                  <input
                    type="text"
                    required
                    value={clinicaNombre}
                    onChange={(e) => handleClinicaNombreChange(e.target.value)}
                    placeholder="Ej. Clínica Las Américas"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-gray-300 text-sm text-[#1E162B] focus:outline-none focus:border-[#4E2A84]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Nombre del Profesional o Administrador
                  </label>
                  <input
                    type="text"
                    required
                    value={adminNombre}
                    onChange={(e) => setAdminNombre(e.target.value)}
                    placeholder="Dra. Sofía Restrepo"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-gray-300 text-sm text-[#1E162B] focus:outline-none focus:border-[#4E2A84]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Correo electrónico
                    </label>
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="direccion@clinica.com"
                      className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-gray-300 text-sm text-[#1E162B] focus:outline-none focus:border-[#4E2A84]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Contraseña
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-gray-300 text-sm text-[#1E162B] focus:outline-none focus:border-[#4E2A84]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-full bg-[#4E2A84] hover:bg-[#3B1E66] disabled:opacity-50 text-white font-semibold text-sm transition mt-2"
                >
                  {loading
                    ? "Preparando tu consultorio..."
                    : "Crear cuenta de la clínica"}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
