import { z } from 'zod';

const ConfigModel = z.object({
  roles: z.object({
    jobDefinition: z.string(),
    jobQueue: z.string(),
    read: z.string(),
    write: z.string(),
  }),
  buckets: z.object({
    read: z.string(),
    write: z.string(),
  }),
  files: z.object({
    sourceFolder: z.string(),
    destinationFolder: z.string(),
    suffix: z.string(),
    extension: z.string(),
    numberPerJob: z.number(),
  }),
  pdal: z.object({
    limits: z.string(),
  }),
});

export type ConfigData = z.infer<typeof ConfigModel>;

export function load(configFile: unknown): ConfigData {
  return ConfigModel.parse(configFile);
}
