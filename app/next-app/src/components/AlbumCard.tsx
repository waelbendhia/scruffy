import LabeledImage from "@/components/LabeledImage";
import { API } from "@scruffy/api";

type Album = API["/album"]["/"]["data"][number];

type BaseProps = Omit<Album, "imageUrl" | "artist"> & {
  artist?: Album["artist"];
  className?: string;
  clickable?: boolean;
  layout?: React.ComponentProps<typeof LabeledImage>["layout"];
  textSize?: "lg" | "xl";
  whiteText?: boolean;
};

type LoadingProps =
  | {
      loading: true;
    }
  | ({ loading?: false; imageUrl?: string } & (
      | { placeholder: "empty" }
      | { placeholder: "blur"; blurDaraURL: string }
    ));

type Props = BaseProps & LoadingProps;

const AlbumCard = ({
  artist,
  className,
  name,
  rating,
  year,
  clickable = true,
  layout = "horizontal",
  textSize = "lg",
  whiteText = false,
  ...props
}: Props) => {
  const artistSize = textSize === "lg" ? "text-lg" : "text-xl";
  const albumSize =
    textSize === "lg" ? ("text-base" as const) : ("text-lg" as const);
  const otherSize =
    textSize === "lg" ? ("text-sm" as const) : ("text-base" as const);
  const yearColor = whiteText ? "text-dark-white" : "text-gray";

  return (
    <LabeledImage
      {...props}
      whiteText={whiteText}
      layout={layout}
      className={className}
      url={clickable ? artist?.url : undefined}
      imageUrl={!props.loading ? props.imageUrl ?? "/album-default.svg" : ""}
      imageClassName={
        rating >= 8
          ? `before:content-[''] before:absolute before:bg-scruff before:h-full
            before:w-full before:z-10 before:bg-1/2 before:bg-no-repeat
            before:bg-scruff-offset`
          : ""
      }
    >
      <div className={"overflow-hidden max-width-full"}>
        {artist && (
          <div
            className={`
              overflow-hidden whitespace-nowrap text-ellipsis max-w-full
              ${artistSize} font-bold
            `}
          >
            {artist.name}
          </div>
        )}
        <div className={`overflow-hidden whitespace-normal ${albumSize}`}>
          {name ?? " "}
        </div>
        <div className={`overflow-hidden text-ellipsis ${otherSize}`}>
          <b>{rating}</b> / 10
        </div>
        <div
          className={`
            overflow-hidden text-ellipsis ${otherSize} ${yearColor} font-bold
            group-hover:text-red
          `}
        >
          {year ?? "N/A"}
        </div>
      </div>
    </LabeledImage>
  );
};

export default AlbumCard;
