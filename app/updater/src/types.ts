import { Observable } from "rxjs";

export type Observed<O extends Observable<any>> = O extends Observable<infer x>
  ? x
  : never;
