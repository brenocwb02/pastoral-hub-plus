import { z } from "zod";

// Esquema de Membro Detalhado
export const memberSchema = z.object({
  full_name: z.string()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(100, "Nome deve ter no máximo 100 caracteres")
    .regex(/^[a-zA-ZÀ-ÿ\s']+$/, "Nome deve conter apenas letras e espaços"),
  email: z.string()
    .email("Email inválido")
    .optional()
    .or(z.literal("")),
  phone: z.string()
    .regex(/^\(\d{2}\)\s\d{4,5}-\d{4}$/, "Formato: (11) 99999-9999")
    .optional()
    .or(z.literal("")),
  endereco: z.string().max(200, "Endereço muito longo").optional().or(z.literal("")),
  data_nascimento: z.string().optional().or(z.literal("")), // A validação de data será feita no input type="date"
  estado_civil: z.string().optional().or(z.literal("")),
  data_batismo: z.string().optional().or(z.literal("")),
  discipulador_id: z.string().uuid("Selecione um discipulador válido"),
  casa_id: z.string().uuid("Selecione uma casa de paz válida").optional().or(z.literal("")),
});

// House validation schema
export const houseSchema = z.object({
  nome: z.string()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(100, "Nome deve ter no máximo 100 caracteres"),
  endereco: z.string()
    .min(5, "Endereço deve ter pelo menos 5 caracteres")
    .max(200, "Endereço deve ter no máximo 200 caracteres")
    .optional()
    .or(z.literal("")),
});

// Meeting validation schema
export const meetingSchema = z.object({
  title: z.string()
    .min(3, "Título deve ter pelo menos 3 caracteres")
    .max(100, "Título deve ter no máximo 100 caracteres"),
  description: z.string()
    .max(500, "Descrição deve ter no máximo 500 caracteres")
    .optional()
    .or(z.literal("")),
  location: z.string()
    .max(200, "Local deve ter no máximo 200 caracteres")
    .optional()
    .or(z.literal("")),
  scheduled_at: z.string()
    .refine((date) => {
      const now = new Date();
      const inputDate = new Date(date);
      // Remove a validação de data no futuro para permitir edição de eventos passados
      return !isNaN(inputDate.getTime());
    }, "Data inválida"),
});

// One-on-One validation schema
export const oneOnOneSchema = z.object({
  discipulo_membro_id: z.string()
    .min(1, "Selecione um discípulo"),
  scheduled_at: z.string()
    .refine((date) => {
      const now = new Date();
      const inputDate = new Date(date);
      return !isNaN(inputDate.getTime());
    }, "Data inválida"),
  duration_minutes: z.number()
    .min(15, "Duração mínima: 15 minutos")
    .max(480, "Duração máxima: 8 horas"),
  notes: z.string()
    .max(500, "Notas devem ter no máximo 500 caracteres")
    .optional()
    .or(z.literal("")),
});

// Study Plan validation schema
export const studyPlanSchema = z.object({
  title: z.string()
    .min(3, "Título deve ter pelo menos 3 caracteres")
    .max(100, "Título deve ter no máximo 100 caracteres"),
  description: z.string()
    .max(1000, "Descrição deve ter no máximo 1000 caracteres")
    .optional()
    .or(z.literal("")),
});

// Progress validation schema
export const progressSchema = z.object({
  membro_id: z.string()
    .min(1, "Selecione um membro"),
  plano_id: z.string()
    .min(1, "Selecione um plano"),
  status: z.enum(["not_started", "in_progress", "completed"], {
    errorMap: () => ({ message: "Status inválido" }),
  }),
  notes: z.string()
    .max(500, "Notas devem ter no máximo 500 caracteres")
    .optional()
    .or(z.literal("")),
});

// Auth validation schemas
export const signUpSchema = z.object({
  email: z.string()
    .email("Email inválido")
    .min(1, "Email é obrigatório"),
  password: z.string()
    .min(8, "Senha deve ter pelo menos 8 caracteres")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Senha deve conter pelo menos: uma letra minúscula, uma maiúscula e um número"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Senhas não coincidem",
  path: ["confirmPassword"],
});

export const signInSchema = z.object({
  email: z.string()
    .email("Email inválido")
    .min(1, "Email é obrigatório"),
  password: z.string()
    .min(1, "Senha é obrigatória"),
});

export type MemberFormData = z.infer<typeof memberSchema>;
export type HouseFormData = z.infer<typeof houseSchema>;
export type MeetingFormData = z.infer<typeof meetingSchema>;
export type OneOnOneFormData = z.infer<typeof oneOnOneSchema>;
export type StudyPlanFormData = z.infer<typeof studyPlanSchema>;
export type ProgressFormData = z.infer<typeof progressSchema>;
export type SignUpFormData = z.infer<typeof signUpSchema>;
export type SignInFormData = z.infer<typeof signInSchema>;
