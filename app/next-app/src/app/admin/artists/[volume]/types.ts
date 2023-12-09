export type SearchResult<T> =
  | {
      status: "ok";
      data: T[];
    }
  | {
      status: "timed out";
    }
  | {
      status: "disabled";
    }
  | {
      status: "unknown";
    };

export const handleSearchResp = async <T>(
  resp: Response,
): Promise<SearchResult<T>> => {
  switch (resp.status) {
    case 200:
      const res: T[] = await resp.json();
      return { status: "ok", data: res };
    case 408:
      return { status: "timed out" };
    case 404:
      const errBody: {
        message: string;
        error: "not_found" | "provider_disabled";
      } = await resp.json();
      return { status: errBody.error === "provider_disabled" ? "disabled" : "unknown" };
    default:
      return { status: "unknown" };
  }
};
