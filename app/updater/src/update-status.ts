import { Subject } from "rxjs";

export type UpdateInfo = {
  isUpdating: boolean;
  updateStart?: Date;
  updateEnd?: Date;
  artists: number;
  albums: number;
  pages: number;
  errors: {
    context: string;
    error: unknown;
  }[];
};

const updateInfoSubject = new Subject<UpdateInfo>();

export const watchUpdates = () => updateInfoSubject.asObservable();

let updateInfo: UpdateInfo = {
  isUpdating: false,
  artists: 0,
  albums: 0,
  pages: 0,
  errors: [],
};

export const getUpdateStatus = (): Readonly<typeof updateInfo> => updateInfo;

export const markUpdateStart = () => {
  updateInfo = { ...updateInfo, isUpdating: true, updateStart: new Date() };
  updateInfoSubject.next(updateInfo);
};

export const incrementArtist = () => {
  updateInfo.artists++;
  updateInfoSubject.next(updateInfo);
};

export const incrementAlbum = (count?: number) => {
  if (count !== undefined) {
    updateInfo.albums += count;
  } else {
    updateInfo.albums++;
  }
  updateInfoSubject.next(updateInfo);
};

export const incrementPages = () => {
  updateInfo.pages++;
  updateInfoSubject.next(updateInfo);
};

export const addError = (context: string, error: unknown) => {
  console.error(`error updating: ${context}`, error);
  updateInfo.errors.push({ context, error });
  updateInfoSubject.next(updateInfo);
};

export const markUpdateEnd = () => {
  if (!updateInfo.updateStart) {
    return;
  }

  updateInfo = {
    artists: 0,
    albums: 0,
    pages: 0,
    isUpdating: false,
    updateStart: updateInfo.updateStart,
    updateEnd: new Date(),
    errors: [],
  };
  updateInfoSubject.next(updateInfo);
};
