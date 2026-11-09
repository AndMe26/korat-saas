"use client";

import { useEffect, useState } from "react";

interface PacienteOption {
  id: string;
  nombre: string;
  documento: string;
}

interface ProfesionalOption {
  id: string;
  nombre: string;
  especialidad: string;
}

interface CitaItem {
  id: string;
  fechaHora: string;
  motivo: string;
  estado: string;
  resumenIa: string | null;
  paciente?: PacienteOption;
  profesional?: ProfesionalOption;
}

/**
 * PANTALLA 3: AGENDA DE CITAS MÉDICAS
 * El control de idempotencia sigue enviándose internamente en el header `Idempotency-Key`,
 * pero la interfaz del usuario es 100% limpia y natural para un consultorio médico.
 */
export default function CitasPage() {
  const [citas, setCitas] = useState<CitaItem[]>([]);
  const [pacientes, setPacientes] = useState<PacienteOption[]>([]);
  const [profesionales, setProfesionales] = useState<ProfesionalOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [pacienteId, setPacienteId] = useState("");
  const [profesionalId, setProfesionalId] = useState("");
  const [fechaHora, setFechaHora] = useState("");
  const [motivo, setMotivo] = useState("");
  const [resumenIa, setResumenIa] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const [idempotencyKey, setIdempotencyKey] = useState(() =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : "key-inicial-cita"
  );
  const [statusMsg, setStatusMsg] = useState<{
    type: "ok" | "error" | "replayed";
    text: string;
  } | null>(null);

  async function cargarTodo() {
    try {
      const [citasRes, pacRes, profRes] = await Promise.all([
        fetch("/api/v1/citas"),
        fetch("/api/v1/pacientes"),
        fetch("/api/v1/profesionales"),
      ]);
      const [citasJson, pacJson, profJson] = await Promise.all([
        citasRes.json(),
        pacRes.json(),
        profRes.json(),
      ]);

      if (citasRes.ok) {
        setCitas(citasJson.data || []);
      }
      if (pacRes.ok) {
        setPacientes(pacJson.data || []);
        if (pacJson.data?.[0]?.id) {
          setPacienteId((prev) => prev || pacJson.data[0].id);
        }
      }
      if (profRes.ok) {
        setProfesionales(profJson.data || []);
        if (profJson.data?.[0]?.id) {
          setProfesionalId((prev) => prev || profJson.data[0].id);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void cargarTodo();
  }, []);

  async function handleConsultarIA() {
    if (!motivo || motivo.trim().length < 4) {
      setStatusMsg({
        type: "error",
        text: "Por favor escribe primero el motivo de consulta del paciente.",
      });
      return;
    }

    setAiLoading(true);
    setStatusMsg(null);
    try {
      const profSeleccionado = profesionales.find((p) => p.id === profesionalId);
      const res = await fetch("/api/v1/ai/clinical-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          motivo,
          especialidad: profSeleccionado?.especialidad || "Medicina General",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatusMsg({
          type: "error",
          text: "El asistente se encuentra ocupado en este momento. Intenta en unos segundos.",
        });
        return;
      }
      setResumenIa(data.suggestion || "");
    } finally {
      setAiLoading(false);
    }
  }

  async function handleAgendarCita(e: React.FormEvent) {
    e.preventDefault();
    setStatusMsg(null);

    const currentKey = idempotencyKey || crypto.randomUUID();

    const res = await fetch("/api/v1/citas", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": currentKey,
      },
      body: JSON.stringify({
        pacienteId,
        profesionalId,
        fechaHora,
        motivo,
        resumenIa: resumenIa || null,
      }),
    });

    const isReplayed = res.headers.get("X-Idempotent-Replayed") === "true";
    const data = await res.json();

    if (!res.ok) {
      setStatusMsg({
        type: "error",
        text: data.message || "No se pudo agendar la cita médica.",
      });
      return;
    }

    if (isReplayed) {
      setStatusMsg({
        type: "replayed",
        text: "Esta consulta ya había sido registrada previamente.",
      });
    } else {
      setStatusMsg({
        type: "ok",
        text: "Cita médica programada correctamente.",
      });
      setIdempotencyKey(crypto.randomUUID());
      setMotivo("");
      setResumenIa("");
      void cargarTodo();
    }
  }

  async function handleCambiarEstado(id: string, nuevoEstado: string) {
    await fetch("/api/v1/citas", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, estado: nuevoEstado }),
    });
    void cargarTodo();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-stone-900">
          Agenda de Citas Médicas
        </h1>
        <p className="text-xs text-stone-500">
          Programa nuevas consultas y administra el estado de atención de tus pacientes.
        </p>
      </div>

      {statusMsg && (
        <div
          className={`p-3.5 rounded text-xs border ${
            statusMsg.type === "ok"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : statusMsg.type === "replayed"
                ? "bg-amber-50 border-amber-300 text-amber-900"
                : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {statusMsg.text}
        </div>
      )}

      {/* Formulario de agendamiento */}
      <form
        onSubmit={handleAgendarCita}
        className="p-5 rounded-lg bg-white border border-stone-200 space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">
              Paciente
            </label>
            <select
              required
              value={pacienteId}
              onChange={(e) => setPacienteId(e.target.value)}
              className="w-full px-3 py-2 rounded bg-white border border-stone-300 text-xs text-stone-900"
            >
              <option value="">Seleccionar paciente...</option>
              {pacientes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} ({p.documento})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">
              Especialista asignado
            </label>
            <select
              required
              value={profesionalId}
              onChange={(e) => setProfesionalId(e.target.value)}
              className="w-full px-3 py-2 rounded bg-white border border-stone-300 text-xs text-stone-900"
            >
              <option value="">Seleccionar médico...</option>
              {profesionales.map((prof) => (
                <option key={prof.id} value={prof.id}>
                  {prof.nombre} — {prof.especialidad}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">
              Fecha y hora de la cita
            </label>
            <input
              type="datetime-local"
              required
              value={fechaHora}
              onChange={(e) => setFechaHora(e.target.value)}
              className="w-full px-3 py-2 rounded bg-white border border-stone-300 text-xs text-stone-900"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-stone-700">
              Motivo de la consulta
            </label>
            <button
              type="button"
              onClick={handleConsultarIA}
              disabled={aiLoading}
              className="text-xs text-[#1B4332] hover:underline font-medium"
            >
              {aiLoading
                ? "Elaborando sugerencia clínica..."
                : "Sugerir valoración de pre-consulta"}
            </button>
          </div>
          <input
            type="text"
            required
            placeholder="Describa los síntomas principales o motivo de la visita"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className="w-full px-3 py-2 rounded bg-white border border-stone-300 text-xs text-stone-900"
          />
        </div>

        {resumenIa && (
          <div className="p-3.5 rounded bg-stone-50 border border-stone-200 text-xs text-stone-700">
            <div className="font-semibold text-stone-900 mb-0.5">
              Recomendación de pre-consulta:
            </div>
            <p>{resumenIa}</p>
          </div>
        )}

        <div className="flex items-center justify-end pt-2">
          <button
            type="submit"
            className="px-5 py-2 rounded bg-[#1B4332] hover:bg-[#143325] text-white font-medium text-xs transition"
          >
            Confirmar cita médica
          </button>
        </div>
      </form>

      {/* Listado de citas */}
      <div className="rounded-lg bg-white border border-stone-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-stone-500">
            Cargando agenda médica...
          </div>
        ) : citas.length === 0 ? (
          <div className="p-8 text-center text-xs text-stone-500">
            No hay consultas programadas en este momento.
          </div>
        ) : (
          <div className="divide-y divide-stone-200">
            {citas.map((c) => (
              <div
                key={c.id}
                className="p-5 flex flex-wrap items-start justify-between gap-4 hover:bg-stone-50"
              >
                <div className="space-y-1 max-w-2xl text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-stone-900 text-sm">
                      {c.paciente?.nombre || "Paciente"}
                    </span>
                    <span className="text-stone-400">·</span>
                    <span className="text-stone-700 font-medium">
                      {c.profesional?.nombre || "Médico"} (
                      {c.profesional?.especialidad})
                    </span>
                  </div>
                  <p className="text-stone-700">{c.motivo}</p>
                  {c.resumenIa && (
                    <p className="text-stone-600 bg-stone-100 border border-stone-200 rounded px-3 py-1.5 mt-1">
                      {c.resumenIa}
                    </p>
                  )}
                  <div className="text-[11px] text-stone-500 pt-1">
                    Fecha programada: {new Date(c.fechaHora).toLocaleString()}
                  </div>
                </div>

                <div>
                  <select
                    value={c.estado}
                    onChange={(e) => handleCambiarEstado(c.id, e.target.value)}
                    className="px-2.5 py-1.5 rounded bg-stone-50 border border-stone-300 text-xs font-medium text-stone-800"
                  >
                    <option value="PROGRAMADA">Programada</option>
                    <option value="ATENDIDA">Atendida</option>
                    <option value="CANCELADA">Cancelada</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
