import { ArtistSearchRequest } from "@scruffy/server";
import {
  ReadonlyURLSearchParams,
  usePathname,
  useSearchParams,
  useRouter,
} from "next/navigation";
import React from "react";

const parseIntMaybe = (s: string | undefined | null): number | undefined => {
  const parsed = parseInt(s ?? "");
  return isNaN(parsed) ? undefined : parsed;
};

export const useQueryParams = (): [
  ReadonlyURLSearchParams,
  (_: URLSearchParams) => void,
] => {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  return [
    params ?? new ReadonlyURLSearchParams(new URLSearchParams()),
    (newParams) => {
      router.replace(`${pathname}?${newParams}`);
    },
  ];
};

type SetArtistSearchDispatch = React.Dispatch<
  React.SetStateAction<ArtistSearchRequest>
>;

export const useArtistSearchParams = (): [
  ArtistSearchRequest,
  SetArtistSearchDispatch,
] => {
  const [params, setParams] = useQueryParams();

  const page = parseIntMaybe(params?.get("page"));
  const itemsPerPage = parseIntMaybe(params?.get("itemsPerPage"));
  const name = params?.get("name") ?? undefined;

  const prev = React.useMemo(
    () => ({ page, itemsPerPage, name }),
    [page, itemsPerPage, name],
  );

  const setArtistSearch = React.useCallback(
    (req: React.SetStateAction<ArtistSearchRequest>) => {
      const updated = typeof req === "function" ? req(prev) : req;
      const corrected = { name: "", ...updated };
      console.log(prev, corrected);

      const searchParams = Object.entries(corrected).reduce(
        (prev, [key, val]) => {
          if (val !== undefined) {
            prev.set(key, typeof val === "number" ? `${val}` : val);
          }
          return prev;
        },
        new URLSearchParams(),
      );

      setParams(searchParams);
    },
    [prev, setParams],
  );

  return [prev, setArtistSearch];
};

export const useDebouncedEffect = <T>(
  value: T,
  callback: (_: T) => void,
  debounce = 200,
) => {
  React.useEffect(() => {
    const timeout = setTimeout(() => {
      callback(value);
    }, debounce);
    return () => clearTimeout(timeout);
  }, [value, callback, debounce]);
};

export const useDebounced = <T>(value: T, debounce = 200) => {
  const [debouncedValue, setDebouncedValue] = React.useState(value);
  useDebouncedEffect(value, setDebouncedValue, debounce);
  return debouncedValue;
};
