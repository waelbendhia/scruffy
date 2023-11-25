import ArtistCard from "@/components/ArtistCard";
import LabeledImage from "@/components/LabeledImage";
import { API } from "@scruffy/api";
import { isLoggedIn } from "../actions";
import { headers } from "next/headers";
import { getBlurData } from "@/image";

type Artist = API["/artist"]["/"]["data"][number];

type Props = Omit<Artist, "lastModified" | "url"> & {
  url?: string;
  className?: string;
  imageClassName?: string;
  layout?: React.ComponentProps<typeof LabeledImage>["layout"];
  textSize?: "lg" | "xl";
  whiteText?: boolean;
  imageUrl?: string;
};

const shouldUseAdminURL = async () => {
  "use server";
  const pathname = headers().get("x-pathname");
  if (pathname && pathname.indexOf("/admin") !== -1) return false;
  return await isLoggedIn();
};

const ArtistWithBlur = async (props: Props) => {
  const adminURL =
    props.url && (await shouldUseAdminURL())
      ? `/admin/artists${props.url.split(".")[0]}`
      : undefined;

  if (!props.imageUrl) {
    return <ArtistCard {...props} adminURL={adminURL} placeholder="empty" />;
  }

  const base64 = await getBlurData(props.imageUrl);

  return (
    <ArtistCard
      {...props}
      adminURL={adminURL}
      placeholder="blur"
      blurDaraURL={base64}
    />
  );
};

export default ArtistWithBlur;
