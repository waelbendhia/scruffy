import { getArtist } from "@/app/artists/[volume]/[url]/api";

export const getAlbum = async ({
  volume,
  url,
  name,
}: {
  volume: string;
  url: string;
  name: string;
}) => {
  const artistResp = await getArtist({ volume, url });
  if (artistResp.status !== "ok") {
    return null;
  }

  const { albums, ...artist } = artistResp;
  const decodedName = decodeURIComponent(name);
  const album = albums.find((a) => a.name === decodedName);
  if (!album) {
    return null;
  }

  return { ...album, artist: artist };
};
