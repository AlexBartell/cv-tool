// src/app/page.tsx
import Link from "next/link";
import IntentPopup from "@/components/IntentPopup";
import StickyCtaBar from "@/components/StickyCtaBar";

// ... dentro del JSX, al final o al principio:


type JobOffer = {
  id: string;
  title: string;
  company?: string;
  location: string;
  schedule?: string;
  modality?: string;
  salary?: string;
  requirements: string[];
  benefits?: string[];
  contactLabel: string; // "WhatsApp" / "Teléfono" / "Presencial"
  contactValue: string; // "5512345678" / "Calle..." / "..."
  note?: string;
};

const OFFERS_TODAY: JobOffer[] = [
  {
    id: "mx-001",
    title: "Ayudante de comedor",
    location: "CDMX",
    schedule: "8:00 a.m. – 5:00 p.m. (descanso entre semana)",
    requirements: [
      "Experiencia en comedor industrial (6 meses+)",
      "Conocimiento básico de seguridad e higiene",
      "Atención al cliente interno",
      "Escolaridad: secundaria",
    ],
    benefits: [
      "Pago semanal",
      "Prestaciones de ley desde el 1er día",
      "Comedor y médico subsidiado",
      "Caja de ahorro / crédito (opcionales)",
    ],
    contactLabel: "Teléfono / WhatsApp",
    contactValue: "5648312126",
    note: "Contratación inmediata",
  },
  {
    id: "mx-002",
    title: "Garrotero – Vips (Grupo Alsea)",
    company: "Vips / Grupo Alsea",
    location: "Álvaro Obregón, CDMX (Portal San Ángel)",
    modality: "Turnos rolados",
    requirements: [
      "18+",
      "Secundaria concluida",
      "Disponibilidad para rolar turnos",
      "Constancia de situación fiscal (indispensable)",
    ],
    benefits: [
      "Sueldo base + propinas",
      "Prestaciones superiores a ley",
      "Vales de despensa",
      "Comedor",
      "Descuento en marcas Alsea",
    ],
    contactLabel: "Teléfono",
    contactValue: "5514404486",
    note: "Entrevistas presenciales (preguntar por Gerente Javier)",
  },
  {
    id: "mx-003",
    title: "Supervisor / Encargado de turno – Domino’s",
    company: "Domino’s Pizza (Alsea)",
    location: "Observatorio, CDMX",
    modality: "Presencial · Tiempo completo",
    salary: "$11,000 – $13,000 MXN/mes",
    requirements: [
      "20+",
      "Bachillerato concluido (certificado)",
      "6 meses como supervisor/encargado (restaurante/retail/cine)",
      "Inventarios y manejo de equipos",
    ],
    benefits: ["Vales de despensa", "Prestaciones de ley y superiores", "Crecimiento"],
    contactLabel: "Teléfono",
    contactValue: "5662247230",
  },
  {
    id: "mx-004",
    title: "Administrador de proyecto – Fibra óptica (por proyecto)",
    company: "Telecomunicaciones",
    location: "San Jerónimo, CDMX",
    modality: "Presencial",
    schedule: "L–V 9:00 a 19:00 (2h comida)",
    salary: "$28,000 – $30,000 MXN/mes",
    requirements: [
      "Control de insumos/servicios/entregas",
      "Balances y proyecciones de gastos",
      "Registro de bitácoras y seguimiento administrativo",
    ],
    benefits: ["Prestaciones de ley"],
    contactLabel: "WhatsApp",
    contactValue: "5576148239",
    note: "Enviar CV actualizado",
  },
  {
    id: "mx-005",
    title: "Administrador contable (híbrido)",
    company: "Agencia de promotoría",
    location: "Palmas, Miguel Hidalgo, CDMX",
    modality: "Híbrido (2 días Home Office)",
    schedule: "L–V 9:00 a 18:00",
    salary: "$25,000 – $30,000 MXN/mes",
    requirements: [
      "Lic. Contabilidad o Administración (titulado/a)",
      "3+ años de experiencia",
      "Excel intermedio",
      "Facturación / impuestos / conciliaciones",
    ],
    benefits: ["Prestaciones de ley", "Estabilidad laboral", "Materiales de trabajo"],
    contactLabel: "WhatsApp",
    contactValue: "5580690344",
  },
  {
    id: "mx-006",
    title: "Gestor de cobranza en moto – Megacable",
    company: "Megacable",
    location: "Venustiano Carranza, CDMX",
    modality: "Presencial",
    schedule: "L–S 10:00 a 19:00 (domingo libre)",
    salary: "$16,000 MXN/mes + comisiones",
    requirements: [
      "1 año en cobranza domiciliaria",
      "Manejo de motocicleta",
      "Licencia vigente (según CDMX/EDOMEX)",
    ],
    benefits: [
      "Moto + gasolina/mantenimiento",
      "Bonos semanales",
      "Prestaciones superiores a ley",
      "Capacitación pagada",
    ],
    contactLabel: "WhatsApp (Andrea Adame)",
    contactValue: "4439144723",
  },
];

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-700">
      {children}
    </span>
  );
}

function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-4">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      {subtitle ? (
        <p className="mt-1 text-sm text-neutral-600">{subtitle}</p>
      ) : null}
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      {/* Top bar */}
      <header className="mb-10 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm font-semibold tracking-tight">
            atscv.pro
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            <Link
              href="/tipscv"
              className="rounded-lg px-3 py-2 text-neutral-700 hover:bg-neutral-100"
            >
              Tips CV
            </Link>
            <Link
              href="/tool"
              className="rounded-lg px-3 py-2 text-neutral-700 hover:bg-neutral-100"
            >
              Mejorar CV
            </Link>
            <Link
              href="/create"
              className="rounded-lg bg-black px-3 py-2 font-medium text-white hover:opacity-90"
            >
              Crear CV
            </Link>
          </nav>
        </div>

        {/* Hero */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 sm:p-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                CV listo para postular, sin vueltas
              </h1>
              <p className="mt-3 text-base text-neutral-700">
                Creá tu CV desde cero o mejorá uno existente. Además, te dejamos
                ofertas con contacto directo y tips para postular mejor.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <Pill>Crear CV</Pill>
                <Pill>Mejorar CV</Pill>
                <Pill>Tips CV</Pill>
                <Pill>Ofertas</Pill>
              </div>
            </div>

            <div className="flex w-full flex-col gap-3 sm:w-auto sm:min-w-[260px]">
              <Link
                href="/create"
                className="inline-flex items-center justify-center rounded-xl bg-black px-4 py-3 text-sm font-medium text-white hover:opacity-90"
              >
                Crear CV desde cero
              </Link>
              <Link
                href="/tool"
                className="inline-flex items-center justify-center rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm font-medium hover:bg-neutral-50"
              >
                Mejorar un CV existente
              </Link>
              <Link
                href="/tipscv"
                className="inline-flex items-center justify-center rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm font-medium hover:bg-neutral-50"
              >
                Leer tips para un CV potente
              </Link>
            </div>
          </div>

          <div className="mt-6 rounded-xl bg-neutral-50 p-4 text-sm text-neutral-700">
            Nota: no somos una bolsa de trabajo. Publicamos ofertas de forma
            informativa. Para postular, usá siempre el contacto indicado en cada
            vacante.
          </div>
        </div>
      </header>

      {/* Quick actions */}
      <section className="mb-12 grid gap-4 md:grid-cols-3">
        <Link
          href="/create"
          className="rounded-2xl border border-neutral-200 bg-white p-5 hover:bg-neutral-50"
        >
          <h3 className="text-base font-semibold">Crear CV desde cero</h3>
          <p className="mt-2 text-sm text-neutral-600">
            Ideal si no tenés CV, está desactualizado o querés uno limpio y
            profesional.
          </p>
          <p className="mt-4 text-sm font-medium">Empezar →</p>
        </Link>

        <Link
          href="/tool"
          className="rounded-2xl border border-neutral-200 bg-white p-5 hover:bg-neutral-50"
        >
          <h3 className="text-base font-semibold">Mejorar CV existente</h3>
          <p className="mt-2 text-sm text-neutral-600">
            Pegá tu CV y obtené mejoras prácticas (formato, secciones y
            claridad).
          </p>
          <p className="mt-4 text-sm font-medium">Mejorar →</p>
        </Link>

        <Link
          href="/tipscv"
          className="rounded-2xl border border-neutral-200 bg-white p-5 hover:bg-neutral-50"
        >
          <h3 className="text-base font-semibold">Tips CV</h3>
          <p className="mt-2 text-sm text-neutral-600">
            Guía corta para crear un CV potente y presentable.
          </p>
          <p className="mt-4 text-sm font-medium">Leer →</p>
        </Link>
      </section>

      {/* Offers */}
      <section className="mb-6">
        <SectionTitle
          title="Ofertas de hoy (MX)"
          subtitle="Resumen informativo con contacto directo."
        />

        <div className="grid gap-4 lg:grid-cols-2">
          {OFFERS_TODAY.map((o) => (
            <article
              key={o.id}
              className="rounded-2xl border border-neutral-200 bg-white p-5"
            >
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold tracking-tight">
                      {o.title}
                    </h3>
                    <p className="mt-1 text-sm text-neutral-700">
                      {o.company ? (
                        <>
                          <span className="font-medium">{o.company}</span>{" "}
                          <span className="text-neutral-400">·</span>{" "}
                        </>
                      ) : null}
                      <span>{o.location}</span>
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {o.modality ? <Pill>{o.modality}</Pill> : null}
                    {o.salary ? <Pill>{o.salary}</Pill> : null}
                  </div>
                </div>

                {o.schedule ? (
                  <p className="text-sm text-neutral-600">
                    <span className="font-medium text-neutral-700">
                      Horario:
                    </span>{" "}
                    {o.schedule}
                  </p>
                ) : null}

                <div className="mt-3">
                  <p className="text-sm font-medium text-neutral-800">
                    Requisitos clave
                  </p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-neutral-700">
                    {o.requirements.slice(0, 4).map((r, idx) => (
                      <li key={idx}>{r}</li>
                    ))}
                  </ul>
                </div>

                {o.benefits?.length ? (
                  <div className="mt-3">
                    <p className="text-sm font-medium text-neutral-800">
                      Ofrecen
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {o.benefits.slice(0, 6).map((b, idx) => (
                        <Pill key={idx}>{b}</Pill>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="mt-4 rounded-xl bg-neutral-50 p-4">
                  <p className="text-sm text-neutral-800">
                    <span className="font-medium">{o.contactLabel}:</span>{" "}
                    <span className="font-semibold">{o.contactValue}</span>
                  </p>
                  {o.note ? (
                    <p className="mt-1 text-xs text-neutral-600">{o.note}</p>
                  ) : null}
                </div>

                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <Link
                    href="/create"
                    className="inline-flex flex-1 items-center justify-center rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white hover:opacity-90"
                  >
                    Crear CV para postular
                  </Link>
                  <Link
                    href="/tool"
                    className="inline-flex flex-1 items-center justify-center rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium hover:bg-neutral-50"
                  >
                    Mejorar mi CV
                  </Link>
                </div>

                <p className="mt-2 text-xs text-neutral-500">
                  Consejo: usá un CV simple (PDF/Doc), títulos claros y palabras
                  clave del puesto.
                </p>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-neutral-200 bg-white p-5">
          <p className="text-sm text-neutral-700">
            ¿Querés que agreguemos más ofertas? Este listado es curado y se
            actualiza manualmente.
          </p>
          <p className="mt-2 text-xs text-neutral-500">
            Importante: si una empresa solicita datos sensibles, verificá la
            legitimidad antes de enviar documentación.
          </p>
        </div>
      </section>

      <footer className="mt-12 border-t pt-6 text-xs text-neutral-500">
        © {new Date().getFullYear()} atscv.pro · Recursos para CV y postulación
      </footer>
<StickyCtaBar delayMs={6000} dismissDays={10} />
<IntentPopup delayMs={12000} dismissDays={10} />
    </main>
  );
}
