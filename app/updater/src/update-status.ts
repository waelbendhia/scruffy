import { Subject } from "rxjs";

export type UpdateInfo = {
  isUpdating: boolean;
  updateStart?: Date;
  updateEnd?: Date;
  artists: number;
  albums: number;
  pages: number;
};

const updateInfoSubject = new Subject<UpdateInfo>();

export const watchUpdates = () => updateInfoSubject.asObservable()

let updateInfo: UpdateInfo = {
  isUpdating: false,
  artists: 0,
  albums: 0,
  pages: 0,
};

export const getUpdateStatus = (): Readonly<typeof updateInfo> => updateInfo;

export const markUpdateStart = () => {
  updateInfo = { ...updateInfo, isUpdating: true, updateStart: new Date() };
  updateInfoSubject.next(updateInfo);
};

export const incrementArtist = () => {
  updateInfo.artists++;
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
  };
  updateInfoSubject.next(updateInfo);
};
