import { z } from "zod";

export const productSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio"),
  price: z.coerce.number().positive("El precio debe ser un número positivo"),
});

export type ProductInput = z.input<typeof productSchema>;
export type ProductOutput = z.output<typeof productSchema>;
