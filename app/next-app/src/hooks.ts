import { ArtistSearchRequest } from "@scruffy/server";
import {
  ReadonlyURLSearchParams,
  usePathname,
  useSearchParams,
  useRouter
} from "next/navigation";

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
  (_: ArtistSearchRequest) => void,
] => {
  const [params, setParams] = useQueryParams();

  return [
    {
      page: parseIntMaybe(params?.get("page")),
      itemsPerPage: parseIntMaybe(params?.get("itemsPerPage")),
      name: params?.get("name") ?? undefined,
    },
    (req) => {
      const searchParams = Object.entries(req).reduce((prev, [key, val]) => {
        if (!!val) {
          prev.set(key, typeof val === "number" ? `${val}` : val);
        }
        return prev;
      }, new URLSearchParams());

      setParams(searchParams);
    },
  ];
};
