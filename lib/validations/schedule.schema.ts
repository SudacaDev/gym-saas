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
});

export type ScheduleInput = z.input<typeof scheduleSchema>;
export type ScheduleOutput = z.output<typeof scheduleSchema>;
