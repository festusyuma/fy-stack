import { z } from 'zod';

export const ContainerAppFileSchema = z.object({ key: z.string() });

export const ContainerAppSchema = z.object({
  repository: z.string(),
  tag: z.string().optional(),
  files: z.record(z.string(), ContainerAppFileSchema).optional(),
});
