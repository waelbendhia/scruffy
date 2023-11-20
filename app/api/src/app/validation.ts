import { z } from "zod";

export const Page = z.string().pipe(z.coerce.number().min(0));
export const ItemsPerPage = z.string().pipe(z.coerce.number().min(1).max(50));
