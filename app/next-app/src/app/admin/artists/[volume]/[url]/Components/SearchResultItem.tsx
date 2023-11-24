import ArtistSuspended from "@/app/Components/ArtistSuspended";

type Props = {
  className?: string;
  name: string;
  imageUrl?: string;
};

const SearchResultItem = ({ name, imageUrl, className }: Props) => (
  <ArtistSuspended
    layout="horizontal"
    className={`${className ?? ""} h-48 my-2`}
    imageClassName="w-48"
    name={name}
    imageUrl={imageUrl}
  />
);

export default SearchResultItem;
