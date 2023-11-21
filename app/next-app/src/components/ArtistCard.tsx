import LabeledImage from "@/components/LabeledImage";
import { API } from "@scruffy/api";

type Props = API["/artist"]["/"]["data"][number] & {
  className?: string;
  layout?: "horizontal" | "vertical";
} & ({ placeholder: "empty" } | { placeholder: "blur"; blurDaraURL: string });

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
      <div className={`overflow-hidden text-ellipsis text-lg font-bold`}>
        {name}
      </div>
    </div>
  </LabeledImage>
);

export default ArtistCard;
