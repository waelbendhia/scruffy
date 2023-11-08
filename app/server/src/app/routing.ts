// For the time being I've only got GET requests so no point in specifying methods
type RequestHandler<Resp = any> = (...args: any[]) => Promise<Resp>;

export type Router<Domain extends string> = {
  domain: Domain;
  routes: {
    // For the time being I've only got GET requests so no point in specifying methods
    [path: string]: RequestHandler | Router<any>;
  };
};

export type RouterType<R extends Router<string>> = {
  [Path in keyof R["routes"]]: R["routes"][Path] extends RequestHandler<
    infer resp
  >
    ? resp
    : R["routes"][Path] extends Router<string>
    ? RouterType<R["routes"][Path]>
    : never;
};
