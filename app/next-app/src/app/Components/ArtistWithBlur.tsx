import ArtistCard from "@/components/ArtistCard";
import LabeledImage from "@/components/LabeledImage";
import { API } from "@scruffy/api";
import { getPlaiceholder } from "plaiceholder";

type Artist = API["/artist"]["/"]["data"][number];

type Props = Artist & {
  className?: string;
  clickable?: boolean;
  layout?: React.ComponentProps<typeof LabeledImage>["layout"];
  textSize?: "lg" | "xl";
  whiteText?: boolean;
  imageUrl?: string;
};

const ArtistWithBlur = async (props: Props) => {
  if (!props.imageUrl) {
    return <ArtistCard {...props} placeholder="empty" />;
  }

  const res = await fetch(props.imageUrl);
  const buffer = Buffer.from(await res.arrayBuffer());
  const { base64 } = await getPlaiceholder(buffer);
  return <ArtistCard {...props} placeholder="blur" blurDaraURL={base64} />;
};

export default ArtistWithBlur;
