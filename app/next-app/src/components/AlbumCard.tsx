import LabeledImage from "@/components/LabeledImage";
import { API } from "@scruffy/server";

type Props = API["/album"]["/"]["data"][number] & {
  className?: string;
  clickable?: boolean;
  layout?: React.ComponentProps<typeof LabeledImage>["layout"];
  textSize?: "lg" | "xl";
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
}: Props) => {
  const artistSize = textSize;
  const albumSize = textSize === "lg" ? ("base" as const) : ("lg" as const);
  const otherSize = textSize === 'lg' ? 'sm' as const : 'base' as const

  return (
    <LabeledImage
      layout={layout}
      className={className}
      url={clickable ? artist.url : undefined}
      imageUrl={imageUrl ?? "/album-default.svg"}
      imageClassName={
        rating >= 8
          ? `before:content-[''] before:absolute before:bg-scruff before:h-full ` +
            `before:w-full before:z-10 before:bg-1/2 before:bg-no-repeat before:bg-scruff-offset`
          : ""
      }
    >
      <div className={"overflow-hidden"}>
        <div
          className={`overflow-hidden text-ellipsis text-${artistSize} font-bold`}
        >
          {artist.name}
        </div>
        <div
          className={`overflow-hidden text-ellipsis text-${albumSize} italic`}
        >
          {name ?? " "}
        </div>
        <div className={`overflow-hidden text-ellipsis text-${otherSize}`}>
          <b>{rating}</b> / 10
        </div>
        <div
          className={
            `overflow-hidden text-ellipsis text-${otherSize} text-gray font-bold ` +
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
