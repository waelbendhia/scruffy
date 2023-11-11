import LabeledImage from "@/components/LabeledImage";
import { API } from "@scruffy/server";

type Props = API["/artist"]["/"]["data"][number] & { className?: string };

const ArtistCard = ({ className, url, imageUrl, name, lastUpdated }: Props) => (
  <LabeledImage
    className={className}
    url={url}
    imageUrl={imageUrl ?? "/artist-default.svg"}
  >
    <div className={`overflow-hidden text-ellipsis`}>
      <div className={`overflow-hidden text-ellipsis text-lg font-bold`}>
        {name}
      </div>
      <div className={`overflow-hidden text-ellipsis text-base`}>
        <b>Updated:</b>{" "}
        {new Date(lastUpdated).toLocaleDateString("en-us", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })}
      </div>
    </div>
  </LabeledImage>
);

export default ArtistCard;
