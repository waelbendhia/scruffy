import LabeledImage from "@/components/LabeledImage";
import { API } from "@scruffy/api";

type Artist = Omit<API["/artist"]["/"]["data"][number], "lastModified">;

type BaseProps = {
  className?: string;
  imageClassName?: string;
  layout?: "horizontal" | "vertical";
  adminURL?: string;
};

type LoadingProps =
  | ({ loading: true } & Partial<Artist>)
  | ({ loading?: false; url?: string } & Omit<Artist, "url"> &
      (
        | { placeholder: "empty" }
        | { placeholder: "blur"; blurDaraURL: string }
      ));

type Props = BaseProps & LoadingProps;

const ArtistCard = ({
  className,
  url,
  imageUrl,
  name,
  layout,
  ...rest
}: Props) => (
  <LabeledImage
    {...rest}
    className={className}
    url={url}
    imageUrl={imageUrl ?? "/artist-default.svg"}
    layout={layout}
  >
    <div
      className={`
        overflow-hidden text-ellipsis text-lg font-bold max-w-full
        group-hover:text-red
      `}
    >
      {name !== undefined || !rest.loading ? (
        name
      ) : (
        <div className={`rounded-md my-0.5 max-w-full h-6 w-40 bg-dark-gray`} />
      )}
    </div>
  </LabeledImage>
);

export default ArtistCard;
