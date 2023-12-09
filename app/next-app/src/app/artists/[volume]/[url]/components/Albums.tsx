import AlbumSuspended from "@/app/Components/AlbumSuspended";
import { getArtist } from "../api";
import { Suspense } from "react";
import AlbumCard from "@/components/AlbumCard";

type Props = Parameters<typeof getArtist>[0];

const AlbumList = async (props: Props) => {
  const artist = await getArtist(props);
  if (artist.status !== "ok") {
    return null;
  }
  const { albums } = artist;

  return (
    <>
      {albums
        .sort((a, b) =>
          b.rating - a.rating === 0
            ? (b.year || 0) - (a.year || 0) === 0
              ? b.name.localeCompare(a.name)
              : (b.year || 0) - (a.year || 0)
            : b.rating - a.rating,
        )
        .map((a) => (
          <AlbumSuspended
            {...a}
            artist={artist}
            displayArtist={false}
            textSize="lg"
            className="w-full h-48 mb-6"
            imageClassName="w-48"
            key={`${a.name}`}
            year={a.year ?? undefined}
            imageUrl={a.imageUrl ?? undefined}
            clickable={false}
          />
        ))}
    </>
  );
};

const AlbumPlaceHolder = () => (
  <>
    {Array.from({ length: 3 }).map((_, i) => (
      <AlbumCard
        key={i}
        loading
        className="w-full h-48 mb-6"
        imageClassName="w-48"
      />
    ))}
  </>
);

const Albums = (props: Props) => (
  <div className="flex-0 w-full">
    <h1 className="text-3xl mb-8">Albums</h1>
    <div className="md:grid md:grid-cols-2 lg:block">
      <Suspense
        key={`${props.volume}/${props.url}`}
        fallback={<AlbumPlaceHolder />}
      >
        <AlbumList {...props} />
      </Suspense>
    </div>
    <div className="lg:hidden mt-12 mb-12 ml-8 h-1 bg-red" />
  </div>
);

export default Albums;
