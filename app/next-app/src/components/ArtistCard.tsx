import LabeledImage from "@/components/LabeledImage";
import { API } from "@scruffy/server";

type Props = API["/artist"]["/"]["data"][number] & {
  className?: string;
  layout?: "horizontal" | "vertical";
};

const ArtistCard = ({ className, url, imageUrl, name, layout }: Props) => (
  <LabeledImage
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
