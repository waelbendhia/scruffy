import LabeledImage from "@/components/LabeledImage";
import { API } from "@scruffy/server";

type Album = API["/album"]["/"]["data"][number];

type Props = Omit<Album, "artist"> & {
  artist?: Album["artist"];
  className?: string;
  clickable?: boolean;
  layout?: React.ComponentProps<typeof LabeledImage>["layout"];
  textSize?: "lg" | "xl";
  whiteText?: boolean;
};

const AlbumCard = ({
  artist,
  imageUrl,
  className,
  name,
  rating,
  year,
  clickable = true,
  layout = "horizontal",
  textSize = "lg",
  whiteText = false,
}: Props) => {
  const artistSize = textSize;
  const albumSize =
    textSize === "lg" ? ("text-base" as const) : ("text-lg" as const);
  const otherSize =
    textSize === "lg" ? ("text-sm" as const) : ("text-base" as const);
  const yearColor = whiteText ? "text-dark-white" : "text-gray";

  return (
    <LabeledImage
      whiteText={whiteText}
      layout={layout}
      className={className}
      url={clickable ? artist?.url : undefined}
      imageUrl={imageUrl ?? "/album-default.svg"}
      imageClassName={
        rating >= 8
          ? `before:content-[''] before:absolute before:bg-scruff before:h-full ` +
            `before:w-full before:z-10 before:bg-1/2 before:bg-no-repeat before:bg-scruff-offset`
          : ""
      }
    >
      <div className={"overflow-hidden"}>
        {artist && (
          <div
            className={`overflow-hidden text-ellipsis ${artistSize} font-bold`}
          >
            {artist.name}
          </div>
        )}
        <div className={`overflow-hidden text-ellipsis ${albumSize} italic`}>
          {name ?? " "}
        </div>
        <div className={`overflow-hidden text-ellipsis ${otherSize}`}>
          <b>{rating}</b> / 10
        </div>
        <div
          className={
            `overflow-hidden text-ellipsis ${otherSize} ${yearColor} font-bold ` +
            `group-hover:text-red`
          }
        >
          {year ?? "N/A"}
        </div>
      </div>
    </LabeledImage>
  );
};

export default AlbumCard;
