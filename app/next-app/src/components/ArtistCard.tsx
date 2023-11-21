import LabeledImage from "@/components/LabeledImage";
import { API } from "@scruffy/api";

type Artist = API["/artist"]["/"]["data"][number];

type BaseProps = {
  className?: string;
  layout?: "horizontal" | "vertical";
};

type LoadingProps =
  | ({ loading: true } & Partial<Artist>)
  | ({ loading?: false } & Artist &
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
    <div className={`overflow-hidden text-ellipsis`}>
      {name !== undefined || !rest.loading ? (
        <div className={`overflow-hidden text-ellipsis text-lg font-bold`}>
          {name}
        </div>
      ) : (
        <div className={`rounded-md my-0.5 max-w-full h-6 w-40 bg-dark-gray`} />
      )}
    </div>
  </LabeledImage>
);

export default ArtistCard;
