import LabeledImage from "@/components/LabeledImage";
import { API } from "@scruffy/api";

type Album = API["/album"]["/"]["data"][number];
type AlbumWithoutArtist = Omit<
  API["/album"]["/"]["data"][number],
  "artist" | "imageUrl"
>;

type BaseProps = {
  className?: string;
  clickable?: boolean;
  layout?: React.ComponentProps<typeof LabeledImage>["layout"];
  textSize?: "lg" | "xl";
  whiteText?: boolean;
};

type LoadingProps =
  | ({
      loading: true;
      artist?: Album["artist"];
    } & Partial<AlbumWithoutArtist>)
  | ({
      loading?: false;
      imageUrl?: string;
      artist?: Album["artist"];
    } & AlbumWithoutArtist &
      (
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
  const yearBG = whiteText ? "bg-dark-white" : "bg-gray";

  const bgCol = whiteText ? "bg-white" : "bg-dark-gray";

  const WithData = <T,>({
    val,
    bg,
    width,
    height,
    children,
  }: React.PropsWithChildren<{
    val?: T;
    width: string;
    height?: string;
    bg?: string;
  }>) =>
    val !== undefined || !props.loading ? (
      children
    ) : (
      <div
        className={`rounded-md my-0.5 max-w-full ${height ?? "h-4"} ${width} ${
          bg ?? bgCol
        }`}
      />
    );

  return (
    <LabeledImage
      {...props}
      whiteText={whiteText}
      layout={layout}
      className={className}
      url={clickable ? artist?.url : undefined}
      imageUrl={!props.loading ? props.imageUrl ?? "/album-default.svg" : ""}
      imageClassName={
        rating !== undefined && rating >= 8
          ? `before:content-[''] before:absolute before:bg-scruff before:h-full
            before:w-full before:z-10 before:bg-1/2 before:bg-no-repeat
            before:bg-scruff-offset`
          : ""
      }
    >
      <div className={"overflow-hidden max-width-full"}>
        <WithData val={artist?.name} width="w-40" height="h-6">
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
        </WithData>
        <WithData val={name} width="w-28">
          <div className={`overflow-hidden whitespace-normal ${albumSize}`}>
            {name ?? " "}
          </div>
        </WithData>
        <WithData val={rating} width="w-10">
          <div className={`overflow-hidden text-ellipsis ${otherSize}`}>
            <b>{rating}</b> / 10
          </div>
        </WithData>
        <WithData val={rating} width="w-9" bg={yearBG}>
          <div
            className={`
            overflow-hidden text-ellipsis ${otherSize} ${yearColor} font-bold
            group-hover:text-red
          `}
          >
            {year ?? "N/A"}
          </div>
        </WithData>
      </div>
    </LabeledImage>
  );
};

export default AlbumCard;
