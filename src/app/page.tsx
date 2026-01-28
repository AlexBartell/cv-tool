'use client';
import Link from "next/link";
import { gaEvent } from "@/lib/ga";
import { useEffect } from "react";

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border bg-white px-2.5 py-1 text-xs font-medium text-gray-700">
      {children}
    </span>
  );
}

function Callout({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="not-prose rounded-2xl border bg-gray-50 p-5">
      <div className="text-sm font-semibold text-gray-900">{title}</div>
      <div className="mt-2 text-sm leading-relaxed text-gray-700">{children}</div>
    </div>
  );
}

function Checklist({ items }: { items: string[] }) {
  return (
    <ul className="not-prose mt-3 space-y-2">
      {items.map((it) => (
        <li key={it} className="flex items-start gap-2 text-sm text-gray-800">
          <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full border bg-white text-xs">
            ✓
          </span>
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

function MiniExample({
  title,
  bad,
  good,
}: {
  title: string;
  bad: string;
  good: string;
}) {
  return (
    <div className="not-prose rounded-2xl border bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-gray-900">{title}</div>
        <div className="flex gap-2">
          <Badge>ATS</Badge>
          <Badge>Reclutamiento</Badge>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl bg-red-50 p-4">
          <div className="text-xs font-semibold text-red-700">Evita</div>
          <pre className="mt-2 whitespace-pre-wrap text-sm text-red-900">
            {bad}
          </pre>
        </div>

        <div className="rounded-xl bg-green-50 p-4">
          <div className="text-xs font-semibold text-green-700">Mejor</div>
          <pre className="mt-2 whitespace-pre-wrap text-sm text-green-900">
            {good}
          </pre>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
useEffect(() => {
  gaEvent("view_home");
}, []);
  return (
    <main className="mx-auto max-w-6xl px-6 pb-28 pt-10">
      {/* Hero */}
      <header className="mb-10">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>Compatible con ATS</Badge>
          <Badge>México · Colombia · USA (ES)</Badge>
          <Badge>PDF + Word</Badge>
        </div>

        <h1 className="mt-4 text-4xl font-bold tracking-tight text-gray-900">
          Currículums que pasan filtros ATS (sin inventar datos)
        </h1>

        <p className="mt-3 max-w-3xl text-lg leading-relaxed text-gray-600">
          En reclutamiento vemos muchísimos currículums. La mayoría no se descarta por falta
          de capacidad, sino por formato, estructura o porque no está alineado al puesto.
          Aquí tienes una guía práctica y dos herramientas para crear o mejorar tu CV con un estándar profesional.
        </p>
      </header>

      <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
        {/* Article */}
        <article className="space-y-10">
          <section className="rounded-3xl border bg-white p-7 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900">
              ¿Qué es un ATS y por qué puede dejarte fuera?
            </h2>
            <p className="mt-3 text-gray-700 leading-relaxed">
              Un ATS (Applicant Tracking System) es el sistema que usan empresas y consultoras
              para organizar y filtrar candidatos. Antes de que una persona lea tu CV, el ATS
              intenta “interpretar” tu documento. Si tu CV está en columnas, con tablas, íconos
              o diseños complejos, muchas veces se rompe y tu información queda mal leída.
            </p>

            <Callout title="Regla de oro (reclutamiento real)">
              Tu CV debe ser fácil de leer para una persona y “parseable” para un ATS.
              Menos diseño, más claridad.
            </Callout>
          </section>

          <section className="rounded-3xl border bg-white p-7 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900">
              Estándar 2026: estructura simple + contenido específico
            </h2>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border bg-gray-50 p-5">
                <div className="text-sm font-semibold text-gray-900">Debe tener</div>
                <Checklist
                  items={[
                    "Nombre y contacto al inicio (ideal 1–2 líneas)",
                    "Resumen profesional breve (3–4 líneas)",
                    "Competencias alineadas al puesto",
                    "Experiencia con bullets (no párrafos largos)",
                    "Herramientas/tecnologías (aunque sea Excel/Word)",
                  ]}
                />
              </div>

              <div className="rounded-2xl border bg-gray-50 p-5">
                <div className="text-sm font-semibold text-gray-900">Evita</div>
                <Checklist
                  items={[
                    "Tablas, columnas o diseños de dos columnas",
                    "Emojis o íconos (pueden romper ATS)",
                    "Secciones vacías tipo “(No se proporcionó…)”",
                    "Un CV genérico para cualquier vacante",
                    "Frases vacías: “proactivo”, “responsable” sin evidencia",
                  ]}
                />
              </div>
            </div>
          </section>

          <MiniExample
            title="Bullets: de genérico a concreto (sin inventar métricas)"
            bad={`• Responsable de tareas administrativas.\n• Apoyo en contabilidad.`}
            good={`- Organicé y controlé documentación contable para mantener trazabilidad y orden interno.\n- Apoyé conciliaciones y reportes en Excel para cierres periódicos.\n- Coordiné con áreas internas/proveedores para resolver diferencias y asegurar continuidad operativa.`}
          />

          <section className="rounded-3xl border bg-white p-7 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900">
              México / Colombia / USA (ES): matices que sí importan
            </h2>

            <div className="mt-4 space-y-4">
              <Callout title="Foto en el CV">
                En México y Colombia a veces se acepta, pero es opcional. En procesos de EE. UU.
                por lo general no se recomienda. Por eso la herramienta te permite incluirla solo en PDF/DOCX
                (sin afectar el texto ATS).
              </Callout>

              <Callout title="Ubicación y contacto">
                En LATAM, teléfono/WhatsApp suele ayudar. Para EE. UU., mantenlo simple y evita datos sensibles
                (nada de documentos, edad o estado civil).
              </Callout>
            </div>
          </section>

          <section className="rounded-3xl border bg-white p-7 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900">
              ¿Crear desde cero o mejorar tu CV actual?
            </h2>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border bg-white p-5">
                <div className="text-sm font-semibold text-gray-900">
                  Crear CV desde cero
                </div>
                <p className="mt-2 text-sm leading-relaxed text-gray-700">
                  Ideal si tu CV está desactualizado, está en formato “bonito” pero no ATS,
                  o si nunca has tenido un documento consistente.
                </p>
                <ul className="mt-3 space-y-2 text-sm text-gray-700">
                  <li>• Te guiamos por secciones</li>
                  <li>• Genera un CV limpio y profesional</li>
                  <li>• Exporta PDF y Word</li>
                </ul>
              </div>

              <div className="rounded-2xl border bg-white p-5">
                <div className="text-sm font-semibold text-gray-900">
                  Mejorar CV existente
                </div>
                <p className="mt-2 text-sm leading-relaxed text-gray-700">
                  Ideal si ya tienes contenido, pero necesitas reescritura, orden y palabras clave
                  para un puesto específico.
                </p>
                <ul className="mt-3 space-y-2 text-sm text-gray-700">
                  <li>• Respeta tu información (sin inventar)</li>
                  <li>• Mejora claridad y compatibilidad ATS</li>
                  <li>• Devuelve Markdown listo</li>
                </ul>
              </div>
            </div>

            <Callout title="Consejo de reclutamiento">
              Si te postulas a una vacante concreta, el mejor resultado viene de ajustar el CV
              para ese puesto (palabras clave y experiencia relevante primero).
            </Callout>
          </section>

          <section className="rounded-3xl border bg-white p-7 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900">
              Checklist final antes de postularte
            </h2>

            <Checklist
              items={[
                "¿Tu nombre y contacto se ven rápido y claro?",
                "¿Tu resumen explica qué haces y a qué puesto apuntas (en 3–4 líneas)?",
                "¿Cada empleo tiene al menos 1–2 bullets concretos?",
                "¿Incluiste herramientas/tecnologías (Excel cuenta)?",
                "¿Evitaste secciones vacías y frases de plantilla?",
              ]}
            />

            <p className="mt-4 text-sm text-gray-600">
              Tip: con esto ya estás mejor que la mayoría de CVs que llegan a una vacante.
            </p>
          </section>
        </article>

        {/* Sidebar */}
        <aside className="h-fit lg:sticky lg:top-8">
          <div className="rounded-3xl border bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Herramientas</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Elige una opción y empieza en menos de 1 minuto.
                </p>
              </div>
              <Badge>Gratis</Badge>
            </div>

            <div className="mt-5 space-y-3">
              <Link
                href="/create"
                className="block w-full rounded-2xl bg-black px-4 py-3 text-center text-sm font-semibold text-white hover:bg-gray-800"
              >
                Crear CV desde cero
              </Link>

              <Link
                href="/tool"
                className="block w-full rounded-2xl border px-4 py-3 text-center text-sm font-semibold text-gray-900 hover:bg-gray-50"
              >
                Mejorar mi CV actual
              </Link>
            </div>

            <div className="mt-5 rounded-2xl bg-gray-50 p-4">
              <div className="text-xs font-semibold text-gray-900">Qué obtienes</div>
              <ul className="mt-2 space-y-1 text-sm text-gray-700">
                <li>• CV en formato ATS</li>
                <li>• Score ATS + sugerencias</li>
                <li>• Exporta PDF y Word</li>
              </ul>
            </div>

            <p className="mt-4 text-xs text-gray-500">
              No inventa datos. Solo mejora estructura y redacción con tu información.
            </p>
<p className="mt-2 text-[11px] text-gray-600">
  Esta herramienta se mantiene con una <span className="font-medium">oferta gratuita opcional</span> para cubrir costos de operación (sin tarjeta).
</p>

          </div>
        </aside>
      </div>

      {/* Mobile sticky CTA */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t bg-white/95 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-3">
          <Link
            href="/create"
            className="flex-1 rounded-xl bg-black px-4 py-3 text-center text-sm font-semibold text-white"
          >
            Crear CV
          </Link>
          <Link
            href="/tool"
            className="flex-1 rounded-xl border px-4 py-3 text-center text-sm font-semibold text-gray-900"
          >
            Mejorar CV
          </Link>
        </div>
<p className="mt-2 text-[11px] text-gray-600">
  Esta herramienta se mantiene con una <span className="font-medium">oferta gratuita opcional</span> para cubrir costos de operación (sin tarjeta).
</p>

      </div>
    </main>
  );
}

