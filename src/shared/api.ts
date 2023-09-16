import Axios from 'axios';
import z from 'zod';

export const get = async <T>(
  url: string,
  decoder: z.ZodType<T>,
  params?: object
) => Axios.get(url, { params }).then((res) => decoder.parseAsync(res.data));
