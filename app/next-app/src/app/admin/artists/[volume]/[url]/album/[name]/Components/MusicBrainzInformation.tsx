import { updaterBaseURL } from "@/api";
import { MusicBrainzReleaseSearchResult } from "@scruffy/updater";
import SearchResult from "./SearchResult";
import { Suspense } from "react";
import { getAlbum } from "../api";

type Params = { volume: string; url: string; name: string };

const getMusicBrainzData = async (artistName: string, albumName: string) => {
  const resp = await fetch(
    `${updaterBaseURL}/musicbrainz/artist/${encodeURIComponent(
      artistName,
    )}/album/${encodeURIComponent(albumName)}`,
  );
  const res: MusicBrainzReleaseSearchResult = await resp.json();

  return res;
};

type Props = {
  params: Params;
  artistSearch?: string;
  albumSearch?: string;
};

const MusicBrainzInformationAsync = async ({
  params,
  artistSearch,
  albumSearch,
}: Props) => {
  let artistName = artistSearch;
  const albumName = albumSearch ?? decodeURIComponent(params.name);
  if (!artistName) {
    const album = await getAlbum(params);
    if (album === null) {
      throw "This should never throw";
    }
    artistName = album.artist.name;
  }

  const musicbrainz = await getMusicBrainzData(artistName, albumName);

  return (
    <SearchResult
      loading={false}
      source="MusicBrainz"
      results={musicbrainz.releases.map((rel) => ({
        artistName: rel["artist-credit"].map((a) => a.artist.name).join(", "),
        name: rel.title,
        imageUrl: rel.front,
        key: rel.id,
        year: rel.date,
      }))}
    />
  );
};

export default function MusicBrainzInformation(props: Props) {
  return (
    <Suspense fallback={<SearchResult loading source="MusicBrainz" />}>
      <MusicBrainzInformationAsync {...props} />
    </Suspense>
  );
}
