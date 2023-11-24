import { updaterBaseURL } from "@/api";
import { LastFMAlbum } from "@scruffy/updater";
import SearchResult from "./SearchResult";
import { Suspense } from "react";
import { getAlbum } from "../api";

type Params = { volume: string; url: string; name: string };

const getLastFMData = async (artistName: string, albumName: string) => {
  const resp = await fetch(
    `${updaterBaseURL}/lastfm/artist/${encodeURIComponent(
      artistName,
    )}/album/${encodeURIComponent(albumName)}`,
  );
  if (resp.status === 404) {
    return null;
  }
  const res: LastFMAlbum = await resp.json();

  return res;
};

type Props = {
  params: Params;
  artistSearch?: string;
  albumSearch?: string;
};

type Image = LastFMAlbum["album"]["image"][number];

type ImageSize = Image["size"];

const gt = (b: ImageSize, a: ImageSize) => {
  switch (a) {
    case "mega":
      return false;
    case "extralarge":
      return b === "mega";
    case "large":
      return b === "mega" || b === "extralarge";
    case "medium":
      return b === "mega" || b === "extralarge" || b === "large";
    case "small":
      return (
        b === "mega" || b === "extralarge" || b === "large" || b === "medium"
      );
    case "":
      return true;
  }
};

const getBiggest = (album: LastFMAlbum) =>
  album.album.image.reduce<Image | undefined>(
    (p, c) => (!p || (gt(c.size, p.size) && c["#text"] !== "") ? c : p),
    undefined,
  );

const LastFMInformationAsync = async ({
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

  const lastfm = await getLastFMData(artistName, albumName);

  return (
    <SearchResult
      loading={false}
      source="LastFM"
      results={
        lastfm === null
          ? []
          : [
              {
                artistName: lastfm.album.artist,
                name: lastfm.album.name,
                imageUrl: getBiggest(lastfm)?.["#text"],
                key: lastfm.album.mbid,
              },
            ]
      }
    />
  );
};

export default function LastFMInformation(props: Props) {
  return (
    <Suspense fallback={<SearchResult loading source="LastFM" />}>
      <LastFMInformationAsync {...props} />
    </Suspense>
  );
}
