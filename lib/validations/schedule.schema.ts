import { z } from "zod";
import { dayOfWeekEnum } from "@/db/schema/enums";

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export const scheduleSchema = z.object({
  dayOfWeek: z.enum(dayOfWeekEnum.enumValues, {
    message: "Día inválido",
  }),
  startTime: z
    .string()
    .regex(TIME_PATTERN, "Hora de inicio inválida (HH:MM)"),
  endTime: z.string().regex(TIME_PATTERN, "Hora de fin inválida (HH:MM)"),
  activityId: z.string().uuid("Elegí una actividad"),
  // Default aforo para cada ocurrencia de esta clase (T-20260826-011).
  // Vacío/undefined = sin límite. Coercionado desde string porque llega de
  // un <input type="number"> de un form — mismo patrón que PlanFormDialog
  // usa para price.
  capacity: z.coerce.number().int().positive("Tiene que ser mayor a 0").optional(),
});

export type ScheduleInput = z.input<typeof scheduleSchema>;
export type ScheduleOutput = z.output<typeof scheduleSchema>;
