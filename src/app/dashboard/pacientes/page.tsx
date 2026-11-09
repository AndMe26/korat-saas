"use client";

import { useEffect, useState } from "react";

interface PacienteItem {
  id: string;
  nombre: string;
  documento: string;
  telefono: string;
  email: string;
  createdAt: string;
}

/**
 * MÓDULO DE PACIENTES
 * Interfaz limpia para el personal de recepción y médicos sin tecnicismos.
 */
export default function PacientesPage() {
  const [pacientes, setPacientes] = useState<PacienteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [nombre, setNombre] = useState("");
  const [documento, setDocumento] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [feedback, setFeedback] = useState<{
    type: "ok" | "error";
    text: string;
  } | null>(null);

  async function cargarPacientes() {
    try {
      const res = await fetch("/api/v1/pacientes");
      const json = await res.json();
      if (res.ok) {
        setPacientes(json.data || []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void cargarPacientes();
  }, []);

  async function handleCrearPaciente(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);

    const res = await fetch("/api/v1/pacientes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": crypto.randomUUID(),
      },
      body: JSON.stringify({ nombre, documento, telefono, email }),
    });

    const json = await res.json();
    if (!res.ok) {
      setFeedback({
        type: "error",
        text: json.message || "No fue posible registrar al paciente.",
      });
      return;
    }

    setFeedback({ type: "ok", text: "Paciente registrado correctamente." });
    setNombre("");
    setDocumento("");
    setTelefono("");
    setEmail("");
    void cargarPacientes();
  }

  async function handleEliminar(id: string) {
    const res = await fetch(`/api/v1/pacientes?id=${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      void cargarPacientes();
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-stone-900">
          Directorio de Pacientes
        </h1>
        <p className="text-xs text-stone-500">
          Consulta y registra la información de contacto de los pacientes del centro médico.
        </p>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded text-xs border ${
            feedback.type === "ok"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Formulario de alta */}
      <form
        onSubmit={handleCrearPaciente}
        className="p-5 rounded-lg bg-white border border-stone-200 grid grid-cols-1 sm:grid-cols-4 gap-3"
      >
        <input
          type="text"
          required
          placeholder="Nombre completo del paciente"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="px-3 py-2 rounded bg-white border border-stone-300 text-xs text-stone-900 focus:outline-none focus:border-[#1B4332]"
        />
        <input
          type="text"
          required
          placeholder="Documento de identidad"
          value={documento}
          onChange={(e) => setDocumento(e.target.value)}
          className="px-3 py-2 rounded bg-white border border-stone-300 text-xs text-stone-900 focus:outline-none focus:border-[#1B4332]"
        />
        <input
          type="text"
          required
          placeholder="Teléfono de contacto"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          className="px-3 py-2 rounded bg-white border border-stone-300 text-xs text-stone-900 focus:outline-none focus:border-[#1B4332]"
        />
        <div className="flex gap-2">
          <input
            type="email"
            required
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 px-3 py-2 rounded bg-white border border-stone-300 text-xs text-stone-900 focus:outline-none focus:border-[#1B4332]"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded bg-[#1B4332] hover:bg-[#143325] text-white font-medium text-xs transition"
          >
            Guardar
          </button>
        </div>
      </form>

      {/* Tabla de Pacientes */}
      <div className="rounded-lg bg-white border border-stone-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-stone-500">
            Cargando listado de pacientes...
          </div>
        ) : pacientes.length === 0 ? (
          <div className="p-8 text-center text-xs text-stone-500">
            No hay pacientes registrados todavía.
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-500">
              <tr>
                <th className="px-5 py-2.5 font-medium">Nombre del paciente</th>
                <th className="px-5 py-2.5 font-medium">Documento</th>
                <th className="px-5 py-2.5 font-medium">Teléfono</th>
                <th className="px-5 py-2.5 font-medium">Correo electrónico</th>
                <th className="px-5 py-2.5 font-medium text-right">Opciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {pacientes.map((p) => (
                <tr key={p.id} className="hover:bg-stone-50">
                  <td className="px-5 py-3 font-medium text-stone-900">
                    {p.nombre}
                  </td>
                  <td className="px-5 py-3 text-stone-700">{p.documento}</td>
                  <td className="px-5 py-3 text-stone-600">{p.telefono}</td>
                  <td className="px-5 py-3 text-stone-600">{p.email}</td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => handleEliminar(p.id)}
                      className="text-red-700 hover:underline"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
