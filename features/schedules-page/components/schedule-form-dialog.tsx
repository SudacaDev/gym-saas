"use client";

import { useState, type ReactElement } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  scheduleSchema,
  type ScheduleInput,
  type ScheduleOutput,
} from "@/lib/validations/schedule.schema";
import type { ClassSchedule } from "@/db/schema/class-schedules";
import type { Activity } from "@/db/schema/activities";
import type { InstructorOption } from "../hooks/useSchedules";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { DAY_LABELS_SHORT, DAY_ORDER } from "../lib/day-labels";
import styles from "./schedule-form-dialog.module.css";

type DayOfWeek = ScheduleInput["dayOfWeek"];

const NEW_ACTIVITY_VALUE = "__new__";
const NO_INSTRUCTOR_VALUE = "__none__";

function instructorLabel(instructor: InstructorOption): string {
  return [instructor.firstName, instructor.lastName].filter(Boolean).join(" ") || "(sin nombre)";
}

/** Prefill for create mode when opened from an empty grid slot (T-20260825-007) — day/time only, never an activity (that's still a deliberate pick). */
export interface ScheduleInitialValues {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
}

function defaultsFor(
  schedule?: ClassSchedule,
  initialValues?: ScheduleInitialValues,
  selfInstructorId?: string,
): ScheduleInput {
  if (schedule) {
    return {
      dayOfWeek: schedule.dayOfWeek,
      startTime: schedule.startTime.slice(0, 5),
      endTime: schedule.endTime.slice(0, 5),
      activityId: schedule.activityId,
      capacity: schedule.capacity ?? undefined,
      instructorId: schedule.instructorId ?? undefined,
    };
  }
  if (initialValues) {
    return {
      dayOfWeek: initialValues.dayOfWeek,
      startTime: initialValues.startTime,
      endTime: initialValues.endTime,
      activityId: "",
      capacity: undefined,
      instructorId: selfInstructorId,
    };
  }
  return {
    dayOfWeek: "monday",
    startTime: "",
    endTime: "",
    activityId: "",
    capacity: undefined,
    instructorId: selfInstructorId,
  };
}

interface ScheduleFormDialogProps {
  /** Element that opens the dialog when clicked (e.g. a <Button>). */
  trigger: ReactElement;
  /** Omit to create a new schedule slot; pass to edit an existing one. */
  schedule?: ClassSchedule;
  /**
   * Create mode only (ignored when `schedule` is passed): prefills
   * day/start/end from the grid slot that was clicked, e.g. an empty cell
   * in ScheduleTableView — see T-20260825-007.
   */
  initialValues?: ScheduleInitialValues;
  /** Tenant's activity catalog, for the picker. */
  activities: Activity[];
  /** Instructor picker options — see GET /api/v1/staff/instructors. */
  instructors: InstructorOption[];
  /**
   * Present only when the viewer is themselves a profesor (T-20260827-007):
   * the API always self-assigns their writes regardless of what this form
   * sends, so showing them a picker they could "change" would be
   * misleading — this renders a static "vos" note instead.
   */
  selfInstructor?: { id: string; name: string };
  onSaved: (schedule: ClassSchedule) => void;
  /**
   * Called when editing removes the slot's original day (the row is
   * deleted server-side outright — see the days-diff comment in
   * onSubmit). Required when `schedule` is passed.
   */
  onRemoved?: (id: string) => void;
  /** Called when the inline "+ nueva actividad" quick-add succeeds. */
  onActivityCreated: (activity: Activity) => void;
}

/**
 * Create/edit dialog for weekly ClassSchedule slots, both driven by the
 * same day-chip picker. Create can multi-select days to batch-create one
 * row per day with the same time/activity; edit starts with the slot's own
 * day pre-selected and diffs the selection on submit — unchecking the
 * original day deletes that row, checking a new day creates one there,
 * keeping the original day updates it in place.
 */
export function ScheduleFormDialog({
  trigger,
  schedule,
  initialValues,
  activities,
  instructors,
  selfInstructor,
  onSaved,
  onRemoved,
  onActivityCreated,
}: ScheduleFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedDays, setSelectedDays] = useState<DayOfWeek[]>(
    schedule ? [schedule.dayOfWeek] : initialValues ? [initialValues.dayOfWeek] : [],
  );
  const [isAddingActivity, setIsAddingActivity] = useState(false);
  const [newActivityName, setNewActivityName] = useState("");
  const [creatingActivity, setCreatingActivity] = useState(false);
  const isEdit = Boolean(schedule);

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ScheduleInput, unknown, ScheduleOutput>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: defaultsFor(schedule, initialValues, selfInstructor?.id),
  });

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setFormError(null);
      setSelectedDays(
        schedule ? [schedule.dayOfWeek] : initialValues ? [initialValues.dayOfWeek] : [],
      );
      setIsAddingActivity(false);
      setNewActivityName("");
      reset(defaultsFor(schedule, initialValues, selfInstructor?.id));
    }
  }

  async function handleCreateActivity() {
    const name = newActivityName.trim();
    if (!name) return;

    setCreatingActivity(true);
    try {
      const res = await fetch("/api/v1/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        setFormError("No se pudo crear la actividad");
        return;
      }

      const activity = (await res.json()) as Activity;
      onActivityCreated(activity);
      setValue("activityId", activity.id, { shouldValidate: true });
      setIsAddingActivity(false);
      setNewActivityName("");
    } finally {
      setCreatingActivity(false);
    }
  }

  function toggleDay(day: DayOfWeek) {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  }

  async function onSubmit(values: ScheduleOutput) {
    setFormError(null);

    if (selectedDays.length === 0) {
      setFormError("Seleccioná al menos un día");
      return;
    }

    const originalDay = schedule?.dayOfWeek;
    const keepsOriginalDay = Boolean(
      isEdit && originalDay && selectedDays.includes(originalDay),
    );
    // Every selected day except the slot's own (already-kept) original day
    // becomes a new row — this covers both plain multi-day create and
    // adding extra days while editing.
    const daysToCreate = selectedDays.filter(
      (day) => !isEdit || day !== originalDay,
    );
    const failedDays: DayOfWeek[] = [];

    if (isEdit && schedule && originalDay) {
      if (keepsOriginalDay) {
        const res = await fetch(`/api/v1/schedules/${schedule.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...values, dayOfWeek: originalDay }),
        });
        if (res.ok) {
          onSaved((await res.json()) as ClassSchedule);
        } else {
          failedDays.push(originalDay);
        }
      } else {
        // Unticking the slot's own day means "this class no longer happens
        // then" — deleted outright, no extra confirm() beyond the toggle
        // itself (confirmed default, 2026-08-21).
        const res = await fetch(`/api/v1/schedules/${schedule.id}`, {
          method: "DELETE",
        });
        if (res.ok) {
          onRemoved?.(schedule.id);
        } else {
          failedDays.push(originalDay);
        }
      }
    }

    const createResults = await Promise.all(
      daysToCreate.map(async (day) => {
        const res = await fetch("/api/v1/schedules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...values, dayOfWeek: day }),
        });
        return { day, res };
      }),
    );

    for (const { day, res } of createResults) {
      if (res.ok) {
        onSaved((await res.json()) as ClassSchedule);
      } else {
        failedDays.push(day);
      }
    }

    if (failedDays.length > 0) {
      setFormError(
        `No se pudo guardar: ${failedDays.map((d) => DAY_LABELS_SHORT[d]).join(", ")}`,
      );
      setSelectedDays(failedDays);
      return;
    }

    handleOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar horario" : "Nuevo horario"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Destildá el día para borrar esta clase, o tildá uno nuevo para agregarla también ahí."
              : "Agregá una clase a uno o más días de la semana, con el mismo horario y actividad."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          <div className={styles.field}>
            <Label id="schedule-days-label">Días</Label>
            <div
              role="group"
              aria-labelledby="schedule-days-label"
              className={styles.dayGrid}
            >
              {DAY_ORDER.map((day) => {
                const checked = selectedDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    aria-pressed={checked}
                    className={cn(styles.dayChip, checked && styles.dayChipSelected)}
                    onClick={() => toggleDay(day)}
                  >
                    {DAY_LABELS_SHORT[day]}
                  </button>
                );
              })}
            </div>
          </div>
          <div className={styles.timeRow}>
            <div className={styles.field}>
              <Label htmlFor="schedule-start">Desde</Label>
              <Input
                id="schedule-start"
                type="time"
                aria-invalid={!!errors.startTime}
                aria-describedby={errors.startTime ? "schedule-start-error" : undefined}
                {...register("startTime")}
              />
              <FieldError id="schedule-start-error" message={errors.startTime?.message} />
            </div>
            <div className={styles.field}>
              <Label htmlFor="schedule-end">Hasta</Label>
              <Input
                id="schedule-end"
                type="time"
                aria-invalid={!!errors.endTime}
                aria-describedby={errors.endTime ? "schedule-end-error" : undefined}
                {...register("endTime")}
              />
              <FieldError id="schedule-end-error" message={errors.endTime?.message} />
            </div>
          </div>
          <div className={styles.field}>
            <Label htmlFor="schedule-activity">Actividad</Label>
            {isAddingActivity ? (
              <div className={styles.newActivityRow}>
                <Input
                  id="schedule-activity"
                  autoFocus
                  placeholder="Nombre de la actividad"
                  value={newActivityName}
                  onChange={(e) => setNewActivityName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleCreateActivity();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={creatingActivity || !newActivityName.trim()}
                  onClick={handleCreateActivity}
                >
                  {creatingActivity ? "Agregando..." : "Agregar"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsAddingActivity(false);
                    setNewActivityName("");
                  }}
                >
                  Cancelar
                </Button>
              </div>
            ) : (
              <Controller
                control={control}
                name="activityId"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      if (value === NEW_ACTIVITY_VALUE) {
                        setIsAddingActivity(true);
                        return;
                      }
                      field.onChange(value);
                    }}
                  >
                    <SelectTrigger
                      id="schedule-activity"
                      className={styles.selectTrigger}
                      aria-invalid={!!errors.activityId}
                      aria-describedby={
                        errors.activityId ? "schedule-activity-error" : undefined
                      }
                    >
                      <SelectValue placeholder="Elegí una actividad">
                        {(value: string | null) =>
                          activities.find((activity) => activity.id === value)?.name ??
                          "Elegí una actividad"
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {activities.map((activity) => (
                        <SelectItem key={activity.id} value={activity.id}>
                          {activity.name}
                        </SelectItem>
                      ))}
                      <SelectSeparator />
                      <SelectItem value={NEW_ACTIVITY_VALUE}>+ Nueva actividad</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            )}
            <FieldError
              id="schedule-activity-error"
              message={errors.activityId?.message}
            />
          </div>
          <div className={styles.field}>
            <Label htmlFor="schedule-capacity">Cupo máximo (opcional)</Label>
            <Input
              id="schedule-capacity"
              type="number"
              min={1}
              placeholder="Sin límite"
              aria-invalid={!!errors.capacity}
              aria-describedby={errors.capacity ? "schedule-capacity-error" : undefined}
              {...register("capacity")}
            />
            <FieldError id="schedule-capacity-error" message={errors.capacity?.message} />
          </div>
          <div className={styles.field}>
            <Label htmlFor="schedule-instructor">Instructor (opcional)</Label>
            {selfInstructor ? (
              <p className={styles.selfInstructorNote}>Vos ({selfInstructor.name})</p>
            ) : (
              <Controller
                control={control}
                name="instructorId"
                render={({ field }) => (
                  <Select
                    value={field.value ?? NO_INSTRUCTOR_VALUE}
                    onValueChange={(value) =>
                      field.onChange(value === NO_INSTRUCTOR_VALUE ? null : value)
                    }
                  >
                    <SelectTrigger id="schedule-instructor">
                      <SelectValue placeholder="Sin instructor asignado">
                        {(value: string | null) =>
                          value && value !== NO_INSTRUCTOR_VALUE
                            ? (instructorLabel(
                                instructors.find((i) => i.id === value) ?? {
                                  id: value,
                                  firstName: null,
                                  lastName: null,
                                },
                              ))
                            : "Sin instructor asignado"
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_INSTRUCTOR_VALUE}>Sin instructor asignado</SelectItem>
                      {instructors.map((instructor) => (
                        <SelectItem key={instructor.id} value={instructor.id}>
                          {instructorLabel(instructor)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            )}
          </div>
          {formError && (
            <p role="alert" className={styles.errorText}>
              {formError}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? "Guardando..."
                : selectedDays.length > 1
                  ? `Guardar (${selectedDays.length} días)`
                  : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
