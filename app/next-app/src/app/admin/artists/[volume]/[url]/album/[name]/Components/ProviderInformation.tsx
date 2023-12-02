import { updaterBaseURL } from "@/api";
import { AlbumResult } from "@scruffy/updater";
import SearchResult from "./SearchResult";
import { Suspense } from "react";
import { getAlbum } from "../api";

type Params = { volume: string; url: string; name: string };

const getProviderData = async (
  provider: string,
  artistName: string,
  albumName: string,
) => {
  const resp = await fetch(
    `${updaterBaseURL}/${provider}/artist/${encodeURIComponent(
      artistName,
    )}/album/${encodeURIComponent(albumName)}`,
  );
  const res: AlbumResult[] = await resp.json();
  return res;
};

type Props = {
  params: Params;
  provider: string;
  label: string;
  artistSearch?: string;
  albumSearch?: string;
};

const ProviderInformationAsync = async ({
  params,
  provider,
  label,
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

  const spotifyResults = await getProviderData(provider, artistName, albumName);

  return (
    <SearchResult loading={false} source={label} results={spotifyResults} />
  );
};

export default function ProviderInformation(props: Props) {
  return (
    <Suspense fallback={<SearchResult loading source={props.label} />}>
      <ProviderInformationAsync {...props} />
    </Suspense>
  );
}
