import { Suspense } from "react";
import { getArtist, getArtistName } from "../api";
import { getColorFromURL } from "color-thief-node";
import Link from "next/link";
import { isLoggedIn } from "@/app/actions";
import { headers } from "next/headers";

type Props = Parameters<typeof getArtist>[0];

const toHex = ([r, g, b]: [number, number, number]): string =>
  `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b
    .toString(16)
    .padStart(2, "0")}`;

const backgroundColorFromImage = async (imageUrl: string | null) => {
  if (imageUrl === null) {
    return undefined;
  }

  try {
    const [r, g, b] = await getColorFromURL(imageUrl);
    const max = Math.max(r, g, b);
    const normalize = (c: number) => Math.round((120 * c) / max);
    const normalized: [number, number, number] = [
      normalize(r),
      normalize(g),
      normalize(b),
    ];
    return toHex(normalized);
  } catch (e) {
    console.error("could not load color", e);
    return undefined;
  }
};

const Name = (props: Props) => {
  const NameG = ({ name: resName }: { name?: string }) => (
    <div
      className={`
          flex flex-col justify-center items-start font-extrabold z-10
          ${!resName ? "animate-pulse" : ""}
        `}
    >
      {resName ? (
        <h1 className="text-5xl m-0 flex-0 font-display">{resName}</h1>
      ) : (
        <div className="h-12 w-56 bg-dark-white rounded-md m-0" />
      )}
      <a
        className="overflow-hidden mt-6 text-white"
        href={`https://scaruffi.com/${props.volume}/${props.url}.html`}
        target="_blank"
      >
        Read on Scaruffi.com
      </a>
    </div>
  );

  const NameAsync = async () => <NameG name={await getArtistName(props)} />;

  return (
    <Suspense key={`${props.volume}/${props.url}`} fallback={<NameG />}>
      <NameAsync />
    </Suspense>
  );
};

const AdminLink = ({ href }: { href: string }) => (
  <Link
    className="
      absolute top-2 left-2 z-30 bg-white-transparent rounded-full font-display
      drop-shadow-sm backdrop-blur w-8 h-8 leading-8 text-center text-xl
      font-bold hover:drop-shadow-md
    "
    href={href}
  >
    !
  </Link>
);

const HeaderG = ({
  backgroundColor,
  imageUrl,
  adminURL,
  ...props
}: Props & {
  backgroundColor?: string;
  imageUrl?: string;
  adminURL?: string;
}) => (
  <div
    className="mb-0 xl:mb-10 relative bg-black w-full h-96 py-8 px-8"
    style={{ backgroundColor }}
  >
    {adminURL && <AdminLink href={adminURL} />}
    <div
      className="
        h-full grid grid-cols-artist-content z-10 max-w-screen-xl
        text-dark-white mx-auto gap-x-8 px-14
      "
    >
      {!imageUrl ? (
        <div
          className="
            bg-dark-gray absolute right-0 top-0 h-full w-full md:w-1/2
            bg-right z-0 animate-pulse
          "
        />
      ) : (
        <div
          className="
            bg-dark-gray absolute right-0 top-0 h-full w-full md:w-1/2
            bg-cover bg-right z-0
          "
          style={{
            backgroundImage: `url('${imageUrl}')`,
          }}
        />
      )}
      <div
        className="
          absolute right-0 top-0 h-full w-full md:w-1/2 bg-gradient-to-r z-10
          from-black to-transparent
        "
        style={{
          backgroundImage:
            backgroundColor !== undefined
              ? `linear-gradient(to right, ${backgroundColor}, transparent)`
              : undefined,
        }}
      />
      <Name {...props} />
    </div>
  </div>
);

const HeaderAsync = async (props: Props & { adminURL?: string }) => {
  const artist = await getArtist(props);
  if (artist.status !== "ok") return null;
  const backgroundColor = await backgroundColorFromImage(artist.imageUrl);

  return (
    <HeaderG
      {...props}
      imageUrl={artist.imageUrl ?? "/artist-default.svg"}
      backgroundColor={backgroundColor}
    />
  );
};

const shouldUseAdminURL = async () => {
  "use server";
  const pathname = headers().get("x-pathname");
  if (pathname && pathname.indexOf("/admin") !== -1) return false;
  return await isLoggedIn();
};

const Header = async (props: Props) => {
  const adminURL =
    props.url && (await shouldUseAdminURL())
      ? `/admin/artists/${props.volume}/${props.url}`
      : undefined;

  return (
    <Suspense
      key={`${props.volume}/${props.url}`}
      fallback={<HeaderG {...props} adminURL={adminURL} />}
    >
      <HeaderAsync {...props} adminURL={adminURL} />
    </Suspense>
  );
};

export default Header;
