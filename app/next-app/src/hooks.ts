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

export const useArtistSearchParams = (): [
  ArtistSearchRequest,
  React.Dispatch<React.SetStateAction<ArtistSearchRequest>>,
] => {
  const [params, setParams] = useQueryParams();
  const prev = {
    page: parseIntMaybe(params?.get("page")),
    itemsPerPage: parseIntMaybe(params?.get("itemsPerPage")),
    name: params?.get("name") ?? undefined,
  };

  return [
    prev,
    (req) => {
      const updated = typeof req === "function" ? req(prev) : req;
      const searchParams = Object.entries(updated).reduce(
        (prev, [key, val]) => {
          if (!!val) {
            prev.set(key, typeof val === "number" ? `${val}` : val);
          }
          return prev;
        },
        new URLSearchParams(),
      );

      setParams(searchParams);
    },
  ];
};

export const useDebounced = <T>(value: T, debounce = 150) => {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedValue(value);
    }, debounce);
    return () => clearTimeout(timeout);
  }, [value, debounce]);

  return debouncedValue;
};
