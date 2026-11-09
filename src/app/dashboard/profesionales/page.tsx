"use client";

import { useEffect, useState } from "react";

interface ProfesionalItem {
  id: string;
  nombre: string;
  especialidad: string;
  telefono: string;
  activo: boolean;
}

/**
 * MÓDULO DE PROFESIONALES MÉDICOS
 * Interfaz clara y sin tecnicismos para administrar el equipo de especialistas.
 */
export default function ProfesionalesPage() {
  const [profesionales, setProfesionales] = useState<ProfesionalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [nombre, setNombre] = useState("");
  const [especialidad, setEspecialidad] = useState("");
  const [telefono, setTelefono] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  async function cargarProfesionales() {
    try {
      const res = await fetch("/api/v1/profesionales");
      const json = await res.json();
      if (res.ok) {
        setProfesionales(json.data || []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void cargarProfesionales();
  }, []);

  async function handleCrear(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);

    const res = await fetch("/api/v1/profesionales", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": crypto.randomUUID(),
      },
      body: JSON.stringify({ nombre, especialidad, telefono, activo: true }),
    });

    const json = await res.json();
    if (!res.ok) {
      setFeedback(json.message || "No se pudo registrar al especialista.");
      return;
    }

    setNombre("");
    setEspecialidad("");
    setTelefono("");
    setFeedback("Especialista agregado correctamente al directorio.");
    void cargarProfesionales();
  }

  async function handleEliminar(id: string) {
    const res = await fetch(`/api/v1/profesionales?id=${id}`, {
      method: "DELETE",
    });
    if (res.ok) void cargarProfesionales();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-stone-900">
          Cuerpo Médico y Especialistas
        </h1>
        <p className="text-xs text-stone-500">
          Administra los profesionales de la salud habilitados para atender consultas.
        </p>
      </div>

      {feedback && (
        <div className="p-3.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs">
          {feedback}
        </div>
      )}

      <form
        onSubmit={handleCrear}
        className="p-5 rounded-lg bg-white border border-stone-200 grid grid-cols-1 sm:grid-cols-3 gap-3"
      >
        <input
          type="text"
          required
          placeholder="Nombre completo (Ej. Dr. Carlos Pérez)"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="px-3 py-2 rounded bg-white border border-stone-300 text-xs text-stone-900 focus:outline-none focus:border-[#1B4332]"
        />
        <input
          type="text"
          required
          placeholder="Especialidad (Ej. Cardiología, Pediatría)"
          value={especialidad}
          onChange={(e) => setEspecialidad(e.target.value)}
          className="px-3 py-2 rounded bg-white border border-stone-300 text-xs text-stone-900 focus:outline-none focus:border-[#1B4332]"
        />
        <div className="flex gap-2">
          <input
            type="text"
            required
            placeholder="Teléfono de contacto"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            className="flex-1 px-3 py-2 rounded bg-white border border-stone-300 text-xs text-stone-900 focus:outline-none focus:border-[#1B4332]"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded bg-[#1B4332] hover:bg-[#143325] text-white font-medium text-xs transition"
          >
            Agregar médico
          </button>
        </div>
      </form>

      <div className="rounded-lg bg-white border border-stone-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-stone-500">
            Cargando directorio médico...
          </div>
        ) : profesionales.length === 0 ? (
          <div className="p-8 text-center text-xs text-stone-500">
            No hay médicos registrados todavía.
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-500">
              <tr>
                <th className="px-5 py-2.5 font-medium">Profesional</th>
                <th className="px-5 py-2.5 font-medium">Especialidad</th>
                <th className="px-5 py-2.5 font-medium">Teléfono</th>
                <th className="px-5 py-2.5 font-medium">Disponibilidad</th>
                <th className="px-5 py-2.5 font-medium text-right">Opciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {profesionales.map((prof) => (
                <tr key={prof.id} className="hover:bg-stone-50">
                  <td className="px-5 py-3 font-medium text-stone-900">
                    {prof.nombre}
                  </td>
                  <td className="px-5 py-3 text-stone-700">
                    {prof.especialidad}
                  </td>
                  <td className="px-5 py-3 text-stone-600">{prof.telefono}</td>
                  <td className="px-5 py-3">
                    <span className="px-2 py-0.5 rounded bg-stone-100 border border-stone-300 text-[11px] text-stone-700">
                      {prof.activo ? "Disponible" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => handleEliminar(prof.id)}
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
