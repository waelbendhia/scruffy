import { Subject, share } from "rxjs";
import { StaticDecode, StaticEncode, Type } from "@sinclair/typebox";

const TAGS_MANIFEST_KEY = "sharedTagsManifest";

const DateString = () =>
  Type.Transform(Type.String())
    .Decode((value) => new Date(value))
    .Encode((value) => value.toLocaleString("en-us"));

export const UpdateInfo = Type.Object({
  isUpdating: Type.Boolean(),
  updateStart: Type.Optional(DateString()),
  updateEnd: Type.Optional(DateString()),
  artists: Type.Number(),
  albums: Type.Number(),
  pages: Type.Number(),
  errors: Type.Array(
    Type.Object({
      context: Type.String(),
      error: Type.Unknown(),
    }),
  ),
});

export type UpdateInfoDec = StaticDecode<typeof UpdateInfo>;
export type UpdateInfoEnc = StaticEncode<typeof UpdateInfo>;

interface Client {
  connect(): Promise<unknown>;
  hSet(k: string, v: Record<string, string | number>): Promise<unknown>;
}

export class StatusUpdater {
  #updateInfo: UpdateInfoDec;
  #updateInfoSubject: Subject<UpdateInfoDec>;
  #redis: Client | undefined;

  constructor(updateInfoSubject?: Subject<UpdateInfoDec>, redis?: Client) {
    this.#updateInfo = {
      isUpdating: false,
      artists: 0,
      albums: 0,
      pages: 0,
      errors: [],
    };

    this.#updateInfoSubject = updateInfoSubject ?? new Subject<UpdateInfoDec>();

    this.#redis = redis;
  }

  private async revalidate(tag: "artists" | "albums") {
    if (!this.#redis) {
      return;
    }

    await this.#redis.hSet(TAGS_MANIFEST_KEY, { [tag]: new Date().getTime() });
  }

  watchUpdates() {
    return this.#updateInfoSubject.asObservable().pipe(share());
  }

  getUpdateStatus(): Readonly<UpdateInfoDec> {
    return this.#updateInfo;
  }

  startUpdate() {
    this.#updateInfo = {
      ...this.#updateInfo,
      isUpdating: true,
      updateStart: new Date(),
    };
    this.#updateInfoSubject.next(this.#updateInfo);
  }

  incrementArtist(count?: number) {
    this.#updateInfo.artists += count ?? 1;
    this.#updateInfoSubject.next(this.#updateInfo);
    this.revalidate("artists");
  }

  incrementAlbum(count?: number) {
    this.#updateInfo.albums += count ?? 1;
    this.#updateInfoSubject.next(this.#updateInfo);
    this.revalidate("albums");
  }

  incrementPages() {
    this.#updateInfo.pages++;
    this.#updateInfoSubject.next(this.#updateInfo);
  }

  addError(context: string, error: unknown) {
    console.error(`error updating: ${context}`, error);
    this.#updateInfo.errors.push({ context, error });
    this.#updateInfoSubject.next(this.#updateInfo);
  }

  endUpdate() {
    if (!this.#updateInfo.updateStart) {
      return;
    }

    this.#updateInfo = {
      ...this.#updateInfo,
      isUpdating: false,
      updateEnd: new Date(),
    };
    this.#updateInfoSubject.next(this.#updateInfo);
  }
}
