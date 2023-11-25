"use server";
import AlbumCard from "@/components/AlbumCard";
import LabeledImage from "@/components/LabeledImage";
import { API } from "@scruffy/api";
import { isLoggedIn } from "../actions";
import { headers } from "next/headers";
import { getBlurData } from "@/image";

type Album = API["/album"]["/"]["data"][number];

type Props = Omit<Album, "imageUrl" | "artist" | "rating"> & {
  rating?: number;
  artist: Partial<Album["artist"]>;
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
  const adminURL =
    artist.url && (await shouldUseAdminURL())
      ? `/admin/artists${artist.url.split(".")[0]}/album/${encodeURIComponent(
          props.name,
        )}`
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

  const base64 = await getBlurData(props.imageUrl);

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
