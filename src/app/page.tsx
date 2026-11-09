import Link from "next/link";

/**
 * PANTALLA 1: PORTAL PÚBLICO DE KORATHEALTH (SSG - Static Site Generation)
 * Experiencia de usuario 100% enfocada en clínicas, médicos y directores de centros de salud
 * (sin mostrar jerga técnica de programación en la interfaz).
 */
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-[#1E162B] flex flex-col font-sans">
      {/* Barra superior informativa */}
      <div className="bg-[#2D124D] text-white/90 text-xs">
        <div className="max-w-7xl mx-auto px-6 h-9 flex items-center justify-between">
          <span>
            Soluciones digitales para clínicas, consultorios médicos y centros de especialistas
          </span>
          <div className="flex items-center gap-5">
            <Link
              href="/login"
              className="font-semibold text-[#C4F07B] hover:underline"
            >
              Portal Médico koratOne® →
            </Link>
          </div>
        </div>
      </div>

      {/* Navegación principal */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-10">
            <Link href="/" className="flex items-center">
              <span className="text-2xl font-extrabold tracking-tight text-[#4E2A84]">
                korathealth
              </span>
              <span className="h-2 w-2 rounded-full bg-[#6CC24A] ml-0.5 mt-2"></span>
            </Link>

            <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-700">
              <a href="#soluciones" className="hover:text-[#4E2A84] transition">
                Historia Clínica
              </a>
              <a href="#beneficios" className="hover:text-[#4E2A84] transition">
                Para Consultorios
              </a>
              <a href="#atencion" className="hover:text-[#4E2A84] transition">
                Coordinación Médica
              </a>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="hidden sm:inline-flex px-5 py-2.5 rounded-full border-2 border-[#4E2A84] text-[#4E2A84] hover:bg-[#F4F0FA] font-semibold text-sm transition"
            >
              Ingresar al Consultorio
            </Link>
            <Link
              href="/login"
              className="px-6 py-2.5 rounded-full bg-[#4E2A84] hover:bg-[#3B1E66] text-white font-semibold text-sm transition"
            >
              Registrar mi Clínica
            </Link>
          </div>
        </div>
      </header>

      {/* Sección Hero */}
      <section className="bg-gradient-to-br from-[#F4F0FA] via-[#FAF8FC] to-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-16 lg:py-24 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-block px-3.5 py-1 rounded-full bg-[#E8DFF5] text-[#4E2A84] text-xs font-bold uppercase tracking-wider">
              koratOne® Gestión Clínica Integral
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[52px] font-bold tracking-tight text-[#1E162B] leading-[1.12]">
              Más tiempo para tus pacientes, menos carga administrativa.
            </h1>

            <p className="text-lg text-gray-600 leading-relaxed max-w-2xl">
              Organiza el directorio de pacientes, la disponibilidad de tus
              especialistas y el agendamiento de consultas desde una plataforma
              ágil, privada y pensada para el flujo diario del consultorio.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                href="/login"
                className="px-7 py-3.5 rounded-full bg-[#4E2A84] hover:bg-[#3B1E66] text-white font-semibold text-sm transition"
              >
                Comenzar con mi clínica
              </Link>
              <Link
                href="/dashboard"
                className="px-7 py-3.5 rounded-full bg-white hover:bg-gray-50 border border-gray-300 text-[#1E162B] font-semibold text-sm transition"
              >
                Ir a mi agenda médica →
              </Link>
            </div>
          </div>

          {/* Vista previa amigable para el médico */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
              <div className="bg-[#2D124D] px-6 py-4 flex items-center justify-between text-white">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm tracking-tight">
                    koratOne®
                  </span>
                  <span className="text-xs text-white/70">
                    · Resumen del Día
                  </span>
                </div>
                <span className="text-xs bg-white/10 px-2.5 py-0.5 rounded-full text-[#C4F07B]">
                  Consultorio Activo
                </span>
              </div>

              <div className="p-6 space-y-5">
                <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                  <div>
                    <div className="text-xs text-gray-400 uppercase font-semibold">
                      Próxima consulta
                    </div>
                    <div className="text-base font-bold text-[#1E162B] mt-0.5">
                      Control Cardiológico — Dra. Sofía Restrepo
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-[#EDF7ED] text-[#1E6B24] text-xs font-semibold">
                    Confirmada
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="p-3.5 rounded-xl bg-[#F8F7FA]">
                    <span className="text-gray-500 block">Atención del día</span>
                    <strong className="text-[#4E2A84] text-base mt-0.5 block">
                      Sin esperas en recepción
                    </strong>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#F8F7FA]">
                    <span className="text-gray-500 block">Privacidad clínica</span>
                    <strong className="text-[#1E162B] text-base mt-0.5 block">
                      Expedientes confidenciales
                    </strong>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#F4F0FA] border border-[#E2D6F3] text-xs text-[#2D124D]">
                  <span className="font-bold block mb-1">
                    Asistente de Pre-consulta:
                  </span>
                  Apoya al equipo médico generando notas preliminares de
                  valoración y signos vitales sugeridos antes de que el paciente
                  ingrese al consultorio.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Beneficios clínicos */}
      <section id="beneficios" className="bg-[#2D124D] text-white py-14">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-10">
          <div className="border-l-4 border-[#6CC24A] pl-5">
            <div className="text-2xl font-bold text-white">
              Privacidad por Institución
            </div>
            <p className="text-sm text-white/80 mt-1">
              La información de tus pacientes y profesionales pertenece
              únicamente a tu centro médico con total confidencialidad.
            </p>
          </div>
          <div className="border-l-4 border-[#C4F07B] pl-5">
            <div className="text-2xl font-bold text-white">
              Agenda sin Cruces
            </div>
            <p className="text-sm text-white/80 mt-1">
              Evita citas duplicadas por errores de conexión o doble clic en
              recepción gracias a nuestro control automático de turnos.
            </p>
          </div>
          <div className="border-l-4 border-[#B794F4] pl-5">
            <div className="text-2xl font-bold text-white">
              Valoración Ágil
            </div>
            <p className="text-sm text-white/80 mt-1">
              Prepara cada consulta con sugerencias de triage según los síntomas
              reportados por el paciente al agendar.
            </p>
          </div>
        </div>
      </section>

      {/* Módulos para el equipo de salud */}
      <section id="soluciones" className="max-w-7xl mx-auto px-6 py-20">
        <div className="max-w-2xl mb-12">
          <p className="text-xs font-bold uppercase tracking-wider text-[#4E2A84]">
            Experiencia Clínica Conectada
          </p>
          <h2 className="text-3xl font-bold text-[#1E162B] mt-2">
            Todo lo que tu centro médico necesita en un solo lugar
          </h2>
        </div>

        <div id="atencion" className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-7 rounded-2xl bg-[#F8F7FA] border border-gray-200 flex flex-col justify-between">
            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-white border border-gray-200 text-xs font-semibold text-[#4E2A84] mb-4">
                Pacientes
              </span>
              <h3 className="text-xl font-bold text-[#1E162B] mb-2">
                Directorio claro y accesible
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Consulta datos de contacto, documento de identidad e historial
                de citas de cada paciente en segundos.
              </p>
            </div>
            <Link
              href="/dashboard/pacientes"
              className="mt-6 text-sm font-bold text-[#4E2A84] hover:underline"
            >
              Administrar pacientes →
            </Link>
          </div>

          <div className="p-7 rounded-2xl bg-[#F8F7FA] border border-gray-200 flex flex-col justify-between">
            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-white border border-gray-200 text-xs font-semibold text-[#4E2A84] mb-4">
                Especialistas
              </span>
              <h3 className="text-xl font-bold text-[#1E162B] mb-2">
                Coordinación del cuerpo médico
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Mantén actualizado el listado de profesionales por especialidad
                médica y su disponibilidad de atención.
              </p>
            </div>
            <Link
              href="/dashboard/profesionales"
              className="mt-6 text-sm font-bold text-[#4E2A84] hover:underline"
            >
              Ver cuerpo médico →
            </Link>
          </div>

          <div className="p-7 rounded-2xl bg-[#F8F7FA] border border-gray-200 flex flex-col justify-between">
            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-white border border-gray-200 text-xs font-semibold text-[#4E2A84] mb-4">
                Consultas
              </span>
              <h3 className="text-xl font-bold text-[#1E162B] mb-2">
                Agenda médica inteligente
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Programa citas vinculando paciente y especialista, con seguimiento
                de estado (Programada, Atendida o Cancelada).
              </p>
            </div>
            <Link
              href="/dashboard/citas"
              className="mt-6 text-sm font-bold text-[#4E2A84] hover:underline"
            >
              Abrir agenda médica →
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-gray-200 bg-[#F8F7FA] py-8 px-6 text-xs text-gray-500 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#4E2A84] text-sm">korathealth</span>
            <span>· Gestión Clínica y Hospitalaria</span>
          </div>
          <span>© 2026 korathealth. Todos los derechos reservados.</span>
        </div>
      </footer>
    </div>
  );
}
