import z from 'zod';

const baseAlbumSchema = z.object({
  name: z.string(),
  year: z.number().optional(),
  rating: z.number(),
  imageUrl: z.string().optional(),
});

export type Album = z.infer<typeof baseAlbumSchema> & {
  band?: Band;
};

type AlbumRawShape = {
  name: z.ZodString;
  year: z.ZodOptional<z.ZodNumber>;
  rating: z.ZodNumber;
  imageUrl: z.ZodOptional<z.ZodString>;
  band: z.ZodLazy<z.ZodOptional<z.ZodType<Band>>>;
};

export const album: z.ZodObject<
  AlbumRawShape,
  z.UnknownKeysParam,
  z.ZodTypeAny,
  Album,
  Album
> = baseAlbumSchema.extend({
  band: z.lazy(() => band.optional()),
});

const baseBandSchema = z.object({
  url: z.string(),
  name: z.string(),
  bio: z.string(),
  imageUrl: z.string().optional(),
});

export type Band = z.infer<typeof baseBandSchema> & {
  relatedBands: Band[];
  albums: Album[];
};

type BandRawShape = {
  url: z.ZodString;
  name: z.ZodString;
  bio: z.ZodString;
  imageUrl: z.ZodOptional<z.ZodString>;
  relatedBands: z.ZodLazy<z.ZodArray<z.ZodType<Band>>>;
  albums: z.ZodLazy<z.ZodArray<z.ZodType<Album>>>;
};

export const band: z.ZodObject<
  BandRawShape,
  z.UnknownKeysParam,
  z.ZodTypeAny,
  Band,
  Band
> = baseBandSchema.extend({
  relatedBands: z.lazy(() => z.array(band)),
  albums: z.lazy(() => z.array(album)),
});

export const callIfFunc = <T1, T2>(f: T2 | ((_: T1) => T2), arg: T1) =>
  f instanceof Function ? f(arg) : f;

export const bound = (min: number, max: number, val: number) =>
  Math.max(Math.min(val, max), min);

type CanUnpack<T> = T extends (...args: unknown[]) => unknown
  ? 1
  : T extends Promise<unknown>
  ? 1
  : 0;

type _U<T> = T extends (...args: unknown[]) => infer U
  ? U
  : T extends Promise<infer U>
  ? U
  : T;

export type Unpack<T> = { 1: Unpack<_U<T>>; 0: T }[CanUnpack<T>];
