import { client } from "@/api";
import Albums from "@/components/Albums";
import Bio from "@/components/Bio";
import { API } from "@scruffy/server";

type Props = {
  params: { volume: string; url: string };
};

const getData = async ({ volume, url }: Props["params"]) => {
  const resp = await client.get<API["/artist"]["/:volume/:url"]>(
    `/artist/${volume}/${url}`,
  );
  return resp.data;
};

const Header = ({
  artist,
  className,
}: {
  className?: string;
  artist: Awaited<ReturnType<typeof getData>>;
}) => (
  <div className={`${className} relative bg-black w-full h-96 py-8 px-8`}>
    <div
      className={
        `text-center h-full grid grid-cols-artist-content z-10 max-w-screen-xl ` +
        `mx-auto gap-x-8 px-6`
      }
    >
      <div
        className={`flex flex-col justify-center items-center text-white font-extrabold`}
      >
        <h1 className={`text-4xl m-0 flex-0 font-display`}>{artist.name}</h1>
        <a
          className={`overflow-hidden mt-10`}
          href={`https://scaruffi.com${artist.url}`}
          target="_blank"
        >
          Read on Scaruffi.com
        </a>
      </div>
      <div
        className={`bg-dark-gray bg-center bg-no-repeat bg-cover w-80`}
        style={{
          backgroundImage: `url('${artist.imageUrl ?? "/artist-default.svg"}')`,
        }}
      />
    </div>
  </div>
);

export default async function ArtistView({ params }: Props) {
  const artist = await getData(params);
  return (
    <main>
      <Header className={`mb-10`} artist={artist} />
      <div
        className={
          `self-stretch grid grid-cols-artist-content gap-x-8 items-start ` +
          `px-6 bg-white-transparent backdrop-blur-sm rounded-sm ` +
          `max-w-screen-xl mx-auto mb-10`
        }
      >
        <Bio bio={artist.bio || ""} />
        <Albums artist={artist} albums={artist.albums || []} />
      </div>
    </main>
  );
}
