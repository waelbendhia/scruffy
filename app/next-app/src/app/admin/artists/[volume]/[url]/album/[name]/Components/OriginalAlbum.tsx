import { Suspense } from "react";
import { getAlbum } from "../api";
import AlbumSuspended from "@/app/Components/AlbumSuspended";
import AlbumCard from "@/components/AlbumCard";

type Props = {
  artist: { vol: string; url: string };
  name: string;
};

const bnmClassname = `
  !grid-rows-[300px_minmax(7.5rem,_9.875rem)] max-w-[inherit] !h-auto mx-auto
`;

const AlbumAsync = async ({ artist: { vol, url }, name }: Props) => {
  const album = await getAlbum({ volume: vol, url, name });
  if (!album) {
    // TODO: proper not found handling
    return "NOT FOUND";
  }

  return (
    <AlbumSuspended
      year={album.year ?? undefined}
      rating={album.rating}
      name={album.name}
      artist={{ name: album.artist.name }}
      imageUrl={album.imageUrl ?? undefined}
      layout="vertical"
      textSize="xl"
      className={bnmClassname}
      imageClassName="h-80"
      displayArtist
    />
  );
};

export default function OriginalAlbum(props: Props) {
  return (
    <Suspense
      fallback={
        <AlbumCard
          loading
          layout="vertical"
          textSize="xl"
          className={bnmClassname}
          imageClassName={`h-80`}
        />
      }
    >
      <AlbumAsync {...props} />
    </Suspense>
  );
}
