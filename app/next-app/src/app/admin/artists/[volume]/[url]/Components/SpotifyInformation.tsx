import { updaterBaseURL } from "@/api";
import { getArtist } from "@/app/artists/[volume]/[url]/api";
import { SpotifyArtistSearchResult } from "@scruffy/updater";
import Image from "next/image";
import SearchResult from "./SearchResult";
import { Suspense } from "react";

type Params = { volume: string; url: string };

const getSpotifyData = async (name: string) => {
  const resp = await fetch(
    `${updaterBaseURL}/spotify/artist/${encodeURIComponent(name)}`,
  );
  const res: SpotifyArtistSearchResult | null = await resp.json();

  return res;
};

type Props = {
  params: Params;
  searchValue?: string;
};

type Image = SpotifyArtistSearchResult["artists"]["items"][number]["images"][0];

const biggestImage = (is: Image[]): Image | undefined =>
  is.reduce<Image | undefined>(
    (prev, cur) =>
      !prev || prev.width * prev.height < cur.width * cur.height ? cur : prev,
    undefined,
  );

const SpotifyInformationAsync = async ({ params, searchValue }: Props) => {
  let name = searchValue;
  if (!name) {
    const artist = await getArtist(params);
    if (artist.status !== "ok") {
      throw "This should never throw";
    }
    name = artist.name;
  }

  const spotify = await getSpotifyData(name);
  const bestMatchIDs = spotify?.best_match.items.map((a) => a.uri);
  const results = [
    ...(spotify?.best_match.items ?? []),
    ...(spotify?.artists.items ?? []).filter(
      (a) => !bestMatchIDs?.some((uri) => a.uri === uri),
    ),
  ].map((a) => ({
    key: a.uri,
    imageUrl: biggestImage(a.images)?.url,
    name: a.name,
  }));

  return <SearchResult source="Spotify" loading={false} results={results} />;
};

export default function SpotifyInformation({ params, searchValue }: Props) {
  return (
    <Suspense fallback={<SearchResult loading source="Spotify" />}>
      <SpotifyInformationAsync params={params} searchValue={searchValue} />
    </Suspense>
  );
}
