import { updaterBaseURL } from "@/api";
import { SpotifyAlbumSearchResult } from "@scruffy/updater";
import SearchResult from "./SearchResult";
import { Suspense } from "react";
import { getAlbum } from "../api";

type Params = { volume: string; url: string; name: string };

const getSpotifyData = async (artistName: string, albumName: string) => {
  const resp = await fetch(
    `${updaterBaseURL}/spotify/artist/${encodeURIComponent(
      artistName,
    )}/album/${encodeURIComponent(albumName)}`,
  );
  const res: SpotifyAlbumSearchResult = await resp.json();

  return res;
};

type Props = {
  params: Params;
  artistSearch?: string;
  albumSearch?: string;
};

type Image = SpotifyAlbumSearchResult["albums"]["items"][number]["images"][0];

const biggestImage = (is: Image[]): Image | undefined =>
  is.reduce<Image | undefined>(
    (prev, cur) =>
      !prev || prev.width * prev.height < cur.width * cur.height ? cur : prev,
    undefined,
  );

const SpotifyInformationAsync = async ({
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

  const spotify = await getSpotifyData(artistName, albumName);
  const bestMatchIDs = spotify.best_match.items.map((a) => a.uri);
  const results = [
    ...spotify.best_match.items,
    ...spotify.albums.items.filter(
      (a) => !bestMatchIDs.some((uri) => a.uri === uri),
    ),
  ].map((a) => ({
    key: a.uri,
    artistName: "",
    imageUrl: biggestImage(a.images)?.url,
    name: a.name,
    year: a.release_date,
  }));

  return <SearchResult loading={false} source="Spotify" results={results} />;
};

export default function SpotifyInformation(props: Props) {
  return (
    <Suspense fallback={<SearchResult loading source="Spotify" />}>
      <SpotifyInformationAsync {...props} />
    </Suspense>
  );
}
