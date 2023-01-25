import { z } from "zod";
import { schemaForType } from "../../helper/zod";

export interface ApObject {
  type: string;
  id: string;
  content: string;
  url?: string;
  to?: string[];
  cc?: string[];
}

export const schemaForObject = schemaForType<ApObject>()(
  z.object({
    type: z.string(),
    id: z.string(),
    content: z.string(),
    url: z.string().optional(),
    to: z.array(z.string()).optional(),
    cc: z.array(z.string()).optional(),
  })
);
