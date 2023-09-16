export type Result<T, E = unknown> =
  | { tag: 'ok'; data: T }
  | { tag: 'error'; data?: undefined; error: E };

export type Loadable<T, E = unknown> =
  | Result<T, E>
  | { tag: 'loading'; data?: undefined }
  | { tag: 'not requested'; data?: undefined };

export const caseOf = <T, V, E = unknown>(
  val: Loadable<T, E>,
  cases: {
    loading: () => V;
    error: (_: E) => V;
    ok: (_: T) => V;
    notRequested: () => V;
  }
) => {
  switch (val.tag) {
    case 'loading':
      return cases.loading();
    case 'error':
      return cases.error(val.error);
    case 'ok':
      return cases.ok(val.data);
    case 'not requested':
      return cases.notRequested();
  }
};
