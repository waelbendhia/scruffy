import { Metadata } from "next";
import { getArtistName } from "./api";
import Albums from "./components/Albums";
import Bio from "./components/Bio";
import Header from "./components/Header";

type Props = {
  params: { volume: string; url: string };
};

export const generateMetadata = async ({ params }: Props) => {
  const artist = await getArtistName(params);

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

export default function ArtistView({ params }: Props) {
  return (
    <main className="flex-1 flex flex-col">
      <Header {...params} />
      <div
        className={`
              self-stretch flex flex-col-reverse lg:grid
              lg:grid-cols-artist-content gap-x-8 items-start px-6
              bg-white-transparent backdrop-blur-sm rounded-sm pt-8 pb-6
              max-w-screen-xl mx-auto mb-10 w-full drop-shadow-md
            `}
      >
        <Bio {...params} />
        <Albums {...params} />
      </div>
    </main>
  );
}
