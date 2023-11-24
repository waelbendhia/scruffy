"use server";
import AlbumCard from "@/components/AlbumCard";
import LabeledImage from "@/components/LabeledImage";
import { API } from "@scruffy/api";
import { getPlaiceholder } from "plaiceholder";
import { isLoggedIn } from "../actions";
import { headers } from "next/headers";

type Album = API["/album"]["/"]["data"][number];

type Props = Omit<Album, "imageUrl" | "artist"> & {
  artist: Album["artist"];
  displayArtist: boolean;
  className?: string;
  imageClassName?: string;
  clickable?: boolean;
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

const AlbumWithBlur = async ({ artist, displayArtist, ...props }: Props) => {
  const adminURL = (await shouldUseAdminURL())
    ? `/admin/artists${artist.url.split(".")[0]}/album/${props.name}`
    : undefined;

  if (!props.imageUrl) {
    return (
      <AlbumCard
        {...props}
        artist={displayArtist ? artist : false}
        adminURL={adminURL}
        placeholder="empty"
      />
    );
  }

  const res = await fetch(props.imageUrl);
  const buffer = Buffer.from(await res.arrayBuffer());
  const { base64 } = await getPlaiceholder(buffer);

  return (
    <AlbumCard
      {...props}
      artist={displayArtist ? artist : false}
      adminURL={adminURL}
      placeholder="blur"
      blurDaraURL={base64}
    />
  );
};

export default AlbumWithBlur;
