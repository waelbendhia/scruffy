import AlbumSuspended from "@/app/Components/AlbumSuspended";

type Props = {
  className?: string;
  artistName: string;
  name: string;
  year?: string;
  imageUrl?: string;
};

const SearchResultItem = ({
  artistName,
  year,
  name,
  imageUrl,
  className,
}: Props) => (
  <AlbumSuspended
    layout="horizontal"
    displayArtist
    className={`${className ?? ""} h-32 my-2`}
    imageClassName="w-32"
    artist={{ name: artistName }}
    year={year ? new Date(year).getFullYear() : undefined}
    name={name}
    imageUrl={imageUrl}
  />
);

export default SearchResultItem;
