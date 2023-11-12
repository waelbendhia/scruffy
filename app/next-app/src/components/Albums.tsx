import { API } from "@scruffy/server";
import AlbumCard from "./AlbumCard";

type Album = API["/artist"]["/:volume/:url"]["albums"][number];
type Artist = React.ComponentProps<typeof AlbumCard>["artist"];

const Albums = ({
  className,
  artist,
  albums,
}: {
  className?: string;
  albums: Album[];
  artist: Artist;
}) => (
  <div className={`${className ?? ""} flex-0 w-full`}>
    <h1>Albums</h1>
    {albums
      .sort((a, b) =>
        b.rating - a.rating === 0
          ? (b.year || 0) - (a.year || 0) === 0
            ? b.name.localeCompare(a.name)
            : (b.year || 0) - (a.year || 0)
          : b.rating - a.rating,
      )
      .map((a) => (
        <AlbumCard
          {...a}
          className={`w-full h-48`}
          key={`${artist.url}-${a.name}`}
          artist={artist}
          year={a.year ?? undefined}
          imageUrl={a.imageUrl ?? undefined}
          clickable={false}
        />
      ))}
  </div>
);
export default Albums;
