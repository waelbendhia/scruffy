import { updaterBaseURL } from "@/api";
import { DeezerAlbumSearchResult } from "@scruffy/updater";
import SearchResult from "./SearchResult";
import { Suspense } from "react";
import { getAlbum } from "../api";

type Params = { volume: string; url: string; name: string };

const getDeezerData = async (artistName: string, albumName: string) => {
  const resp = await fetch(
    `${updaterBaseURL}/deezer/artist/${encodeURIComponent(
      artistName,
    )}/album/${encodeURIComponent(albumName)}`,
  );
  const res: DeezerAlbumSearchResult = await resp.json();

  return res;
};

type Props = {
  params: Params;
  artistSearch?: string;
  albumSearch?: string;
};

const DeezerInformationAsync = async ({
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

  const deezer = await getDeezerData(artistName, albumName);

  return (
    <SearchResult
      loading={false}
      source="Deezer"
      results={deezer.data.map((a) => ({
        key: a.id,
        artistName: a.artist.name,
        name: a.title,
        year: undefined,
        imageUrl: a.cover_xl,
      }))}
    />
  );
};

export default function DeezerInformation(props: Props) {
  return (
    <Suspense fallback={<SearchResult loading source="Deezer" />}>
      <DeezerInformationAsync {...props} />
    </Suspense>
  );
}
