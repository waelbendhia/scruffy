import { baseURL } from "@/api";
import Albums from "@/components/Albums";
import Bio from "@/components/Bio";
import NotFound from "@/components/NotFound";
import { API } from "@scruffy/api";
import { getColorFromURL } from "color-thief-node";
import { Metadata } from "next";

type Props = {
  params: { volume: string; url: string };
};

type Artist = API["/artist"]["/:volume/:url"];

type ArtistResponse =
  | (Artist & { status: "ok" })
  | { status: "not found" }
  | { status: "internal error" };

const getData = async ({
  volume,
  url,
}: Props["params"]): Promise<ArtistResponse> => {
  const resp = await fetch(`${baseURL}/artist/${volume}/${url}`, {
    next: { tags: ["artists"], revalidate: 300 },
  });
  switch (resp.status) {
    case 200:
      const data: API["/artist"]["/:volume/:url"] = await resp.json();

      return { status: "ok", ...data };
    case 404:
      return { status: "not found" };
    default:
      const message = await resp.json();
      console.error("could not get artist", { volume, url }, message);
      return { status: "internal error" };
  }
};

export const generateMetadata = async ({ params }: Props) => {
  const artist = await getData(params);

  switch (artist.status) {
    case "ok":
      return {
        title: artist.name,
        description: `${artist.name} biography and album reviews by Piero Scaruffi.`,
      } satisfies Metadata;
    case "not found":
      return {
        title: "Not Found",
        description: "Not Found",
      } satisfies Metadata;
    case "internal error":
      return {
        title: "Not Found",
        description: "Not Found",
      } satisfies Metadata;
  }
};

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

const Header = async ({
  artist,
  className,
}: {
  className?: string;
  artist: Artist;
}) => {
  const backgroundColor = await backgroundColorFromImage(artist.imageUrl);

  return (
    <div
      className={`${className} relative bg-black w-full h-96 py-8 px-8`}
      style={{ backgroundColor }}
    >
      <div
        className={`
          h-full grid grid-cols-artist-content z-10 max-w-screen-xl
          text-dark-white mx-auto gap-x-8 px-14
        `}
      >
        <div
          className={`
            bg-dark-gray absolute right-0 top-0 h-full w-full md:w-1/2
            bg-cover bg-right z-0
          `}
          style={{
            backgroundImage: `url('${
              artist.imageUrl ?? "/artist-default.svg"
            }')`,
          }}
        />
        <div
          className={`
            absolute right-0 top-0 h-full w-full md:w-1/2 bg-gradient-to-r z-10
            from-black to-transparent
          `}
          style={{
            backgroundImage:
              backgroundColor !== undefined
                ? `linear-gradient(to right, ${backgroundColor}, transparent)`
                : undefined,
          }}
        />
        <div
          className={`
            flex flex-col justify-center items-start font-extrabold z-10
          `}
        >
          <h1 className={`text-5xl m-0 flex-0 font-display`}>{artist.name}</h1>
          <a
            className={`overflow-hidden mt-6 text-white`}
            href={`https://scaruffi.com${artist.url}`}
            target="_blank"
          >
            Read on Scaruffi.com
          </a>
        </div>
      </div>
    </div>
  );
};

export default async function ArtistView({ params }: Props) {
  const artist = await getData(params);
  return (
    <main className="flex-1 flex flex-col">
      {artist.status === "ok" ? (
        <>
          <Header className={`mb-0 xl:mb-10`} artist={artist} />
          <div
            className={`
              self-stretch flex flex-col-reverse lg:grid
              lg:grid-cols-artist-content gap-x-8 items-start px-6
              bg-white-transparent backdrop-blur-sm rounded-sm pt-8 pb-6
              max-w-screen-xl mx-auto mb-10 w-full drop-shadow-md
            `}
          >
            <Bio bio={artist.bio || ""} />
            <Albums artist={artist} albums={artist.albums || []} />
          </div>
        </>
      ) : (
        <NotFound className="m-auto" />
      )}
    </main>
  );
}
