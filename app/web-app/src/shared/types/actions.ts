import { Result } from './loadable';

export interface IAction<T, P> {
  type: T;
  payload: P;
}

export interface IActionNoPayload<T> {
  type: T;
}

export interface IActionFailable<T, P, E = unknown> {
  type: T;
  payload: Result<P, E>;
}

export type ActionType<A extends IActionNoPayload<{}>> =
  A extends IActionNoPayload<infer T> ? T : never;
export type ActionPayload<A extends IAction<{}, {}>> =
  A extends IActionFailable<{}, infer P>
    ? P
    : A extends IAction<{}, infer P2>
    ? P2
    : never;

export const actionCreator =
  <A extends IAction<{}, {}>>(type: ActionType<A>) =>
  (payload: ActionPayload<A>): IAction<ActionType<A>, ActionPayload<A>> => ({
    type,
    payload,
  });

export const noPayloadActionCreator =
  <A extends IActionNoPayload<{}>>(type: ActionType<A>) =>
  (): IActionNoPayload<ActionType<A>> => ({ type });

export const failableActionCreator = <A extends IActionFailable<{}, {}>>(
  type: ActionType<A>
): [
  (_: ActionPayload<A>) => IActionFailable<ActionType<A>, ActionPayload<A>>,
  (_: unknown) => IActionFailable<ActionType<A>, ActionPayload<A>>
] => [
  (p: ActionPayload<A>) => ({ type, payload: { tag: 'ok', data: p } }),
  (e: unknown) => ({ type, payload: { tag: 'error', error: e } }),
];

type ActionCaseOf<A extends IActionNoPayload<string>, S> = {
  [key in ActionType<A>]: (
    a: A extends IActionFailable<key, unknown>
      ? A
      : A extends IAction<key, unknown>
      ? A
      : A extends IActionNoPayload<key>
      ? A
      : never,
    s: S
  ) => S;
};
export const nextState =
  <A extends IActionNoPayload<string>, S>(init: S, cases: ActionCaseOf<A, S>) =>
  (s: S | undefined, a: A) => {
    const state = s || init;
    return !!cases[a.type] ? cases[a.type](a, state) : state;
  };
