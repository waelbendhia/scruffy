import LabeledImage from "@/components/LabeledImage";
import { API } from "@scruffy/server";

type Props = API["/album"]["/"]["data"][number] & { className?: string };

const AlbumCard = ({ artist, imageUrl, className, name, rating }: Props) => (
  <LabeledImage
    className={className}
    url={artist.url}
    imageUrl={imageUrl ?? "/album-default.svg"}
    imageClassName={
      rating >= 8
        ? `before:content-[''] before:absolute before:bg-scruff before:h-full ` +
          `before:w-full before:z-10 before:bg-1/2 before:bg-no-repeat before:bg-scruff-offset`
        : ""
    }
  >
    <div className={"overflow-hidden"}>
      <div className="overflow-hidden text-ellipsis text-lg font-bold">
        {artist.name}
      </div>
      <div className="overflow-hidden text-ellipsis text-base italic">
        {name}
      </div>
    </div>
  </LabeledImage>
);

export default AlbumCard;
