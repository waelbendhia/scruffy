import { Observable, Subject } from "rxjs";

const stopSignal = new Subject<"stop">();
const startSignal = new Subject<"start">();

export const stopUpdate = () => stopSignal.next("stop");

export const watchStopSignal = (): Observable<"stop"> =>
  stopSignal.asObservable();

export const startUpdate = () => startSignal.next("start");

export const watchStartSignal = (): Observable<"start"> =>
  startSignal.asObservable();


const exit = () => stopSignal.complete();

process.on("SIGTERM", exit);
process.on("SIGINT", exit);
