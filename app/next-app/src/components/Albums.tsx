import { API } from "@scruffy/api";
import AlbumSuspended from "@/app/Components/AlbumSuspended";

type Album = API["/artist"]["/:volume/:url"]["albums"][number];

const Albums = ({
  className,
  artist,
  albums,
}: {
  className?: string;
  artist: {
    url: string;
    name: string;
  };
  albums: Album[];
}) => (
  <div className={`${className ?? ""} flex-0 w-full`}>
    <h1 className="text-3xl mb-8">Albums</h1>
    <div
      className={`
        md:grid md:grid-cols-2 lg:block
      `}
    >
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
            className={`w-full h-48 mb-6`}
            imageClassName="w-48"
            key={`${a.name}`}
            year={a.year ?? undefined}
            imageUrl={a.imageUrl ?? undefined}
            clickable={false}
          />
        ))}
    </div>
    <div className={`lg:hidden mt-12 mb-12 ml-8 h-1 bg-red`} />
  </div>
);

export default Albums;
