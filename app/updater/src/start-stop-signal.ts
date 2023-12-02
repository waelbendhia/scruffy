import { Observable, Subject, share } from "rxjs";

const stopSignal = new Subject<"stop">();
const startSignal = new Subject<"start">();

const stopSignalListen = stopSignal.pipe(share());
const startSignalListen = startSignal.pipe(share());

export const stopUpdate = () => stopSignal.next("stop");

export const watchStopSignal = (): Observable<"stop"> => stopSignalListen;

export const startUpdate = () => startSignal.next("start");

export const watchStartSignal = (): Observable<"start"> => startSignalListen;

const exit = () => stopSignal.complete();

process.on("SIGTERM", exit);
process.on("SIGINT", exit);
