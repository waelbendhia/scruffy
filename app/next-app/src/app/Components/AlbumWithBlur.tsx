import AlbumCard from "@/components/AlbumCard";
import LabeledImage from "@/components/LabeledImage";
import { API } from "@scruffy/api";
import { getPlaiceholder } from "plaiceholder";

type Album = API["/album"]["/"]["data"][number];

type Props = Omit<Album, "imageUrl" | "artist"> & {
  artist?: Album["artist"];
  className?: string;
  clickable?: boolean;
  layout?: React.ComponentProps<typeof LabeledImage>["layout"];
  textSize?: "lg" | "xl";
  whiteText?: boolean;
  imageUrl?: string;
};

const AlbumWithBlur = async (props: Props) => {
  if (!props.imageUrl) {
    return <AlbumCard {...props} placeholder="empty" />;
  }

  const res = await fetch(props.imageUrl);
  const buffer = Buffer.from(await res.arrayBuffer());
  const { base64 } = await getPlaiceholder(buffer);
  return <AlbumCard {...props} placeholder="blur" blurDaraURL={base64} />;
};

export default AlbumWithBlur;
