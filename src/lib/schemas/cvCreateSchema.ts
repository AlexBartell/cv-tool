import { z } from "zod";

export const CountryEnum = z.enum(["MX", "CO", "US"]);

export const EducationLevelEnum = z.enum([
  "Secundaria",
  "Tecnico",
  "Licenciatura",
  "Maestria",
  "Doctorado",
  "Bootcamp",
  "Otro",
]);

const UrlOptional = z
  .string()
  .trim()
  .optional()
  .refine((v) => !v || /^https?:\/\//i.test(v), { message: "Debe ser URL http(s)" });

const EmailOptional = z
  .string()
  .trim()
  .optional()
  .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), { message: "Email inválido" });

const DateLike = z.string().trim().min(2);

// En la UI convertís File -> dataURL (Opción A). No es obligatorio enviarlo a /create,
// pero si querés mantenerlo en el mismo payload, lo aceptamos.
const PhotoDataUrlOptional = z
  .string()
  .trim()
  .optional()
  .refine(
    (v) =>
      !v ||
      v.startsWith("data:image/jpeg;base64,") ||
      v.startsWith("data:image/png;base64,") ||
      v.startsWith("data:image/webp;base64,"),
    { message: "photoDataUrl debe ser data:image/(jpeg|png|webp);base64,..." }
  );

export const CvCreateSchema = z
  .object({
    // Contexto
    targetRole: z.string().trim().min(2),
    country: CountryEnum.default("MX"),
    industry: z.string().trim().optional(),

    // Identidad / contacto (LATAM-first)
    profile: z.object({
      fullName: z.string().trim().min(2),
      city: z.string().trim().optional(),
      stateOrRegion: z.string().trim().optional(),
      phoneWhatsapp: z.string().trim().optional(),
      email: EmailOptional,
      linkedin: UrlOptional,
      website: UrlOptional,
    }),

    // Foto opcional (no la usa el LLM; la usa PDF/DOCX)
    photoDataUrl: PhotoDataUrlOptional,

    // Resumen (opcional)
    summary: z.string().trim().max(1200).optional(),

    // Experiencia (repetible)
    experience: z
      .array(
        z.object({
          title: z.string().trim().min(2),
          company: z.string().trim().min(2),
          location: z.string().trim().optional(),
          start: DateLike.optional(),
          end: DateLike.optional(),
          bullets: z.array(z.string().trim().min(2)).max(8).optional(),
          topAchievement: z.string().trim().max(180).optional(),
        })
      )
      .max(12)
      .default([]),

    // Educación
    education: z
      .array(
        z.object({
          level: EducationLevelEnum,
          degree: z.string().trim().min(2).optional(),
          school: z.string().trim().min(2),
          status: z.enum(["En curso", "Egresado", "Incompleto"]).optional(),
          year: z.string().trim().optional(),
          location: z.string().trim().optional(),
          details: z.array(z.string().trim().min(2)).max(5).optional(),
        })
      )
      .max(8)
      .default([]),

    // Skills
    skills: z.object({
      competencies: z.array(z.string().trim().min(2)).max(40).default([]),
      toolsTech: z.array(z.string().trim().min(2)).max(40).default([]),
    }),

    // Idiomas
    languages: z
      .array(
        z.object({
          name: z.string().trim().min(2),
          level: z.enum(["Basico", "Intermedio", "Avanzado", "Nativo"]),
        })
      )
      .max(10)
      .optional(),

    // Cursos/certificaciones
    certifications: z.array(z.string().trim().min(2)).max(20).optional(),

    // Proyectos (avanzado)
    projects: z
      .array(
        z.object({
          name: z.string().trim().min(2),
          link: UrlOptional,
          bullets: z.array(z.string().trim().min(2)).max(6).optional(),
        })
      )
      .max(8)
      .optional(),

    // Solo US (si no lo mandan, igual se genera el CV)
    usWork: z
      .object({
        workAuthorization: z.enum(["Si", "No", "En tramite", "Prefiero no decir"]),
        requiresSponsorship: z.enum(["Si", "No"]).optional(),
      })
      .optional(),
  })
  .superRefine((data, ctx) => {
    // usWork solo aplica para US (pero es opcional)
    if (data.country !== "US" && data.usWork) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["usWork"],
        message: "usWork sólo aplica cuando country = US",
      });
    }
  });

export type CvCreateInput = z.infer<typeof CvCreateSchema>;
