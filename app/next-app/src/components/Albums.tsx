import { API } from "@scruffy/server";
import AlbumCard from "./AlbumCard";

type Album = API["/artist"]["/:volume/:url"]["albums"][number];

const Albums = ({
  className,
  albums,
}: {
  className?: string;
  albums: Album[];
}) => (
  <div className={`${className ?? ""} flex-0 w-full`}>
    <h1 className="text-3xl mb-8">Albums</h1>
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
          textSize="lg"
          className={`w-full h-48 mb-6`}
          key={`${a.name}`}
          year={a.year ?? undefined}
          imageUrl={a.imageUrl ?? undefined}
          clickable={false}
        />
      ))}
  </div>
);
export default Albums;
