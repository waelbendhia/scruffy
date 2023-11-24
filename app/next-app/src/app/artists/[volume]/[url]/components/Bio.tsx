import { Suspense } from "react";
import { getArtist } from "../api";

type Props = Parameters<typeof getArtist>[0];

const BodyPlaceholder = () => (
  <div className="flex flex-col animate-pulse">
    <div className="h-5 mb-0.5 bg-dark-gray ml-4 rounded-md mt-16" />
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="h-5 my-0.5 bg-dark-gray rounded-md" />
    ))}
    <div className="h-5 my-0.5 bg-dark-gray mr-32 rounded-md" />
    <div className="h-5 mb-0.5 bg-dark-gray rounded-md mt-2" />
    {Array.from({ length: 12 }).map((_, i) => (
      <div key={i} className="h-5 my-0.5 bg-dark-gray rounded-md" />
    ))}
    <div className="h-5 my-0.5 bg-dark-gray mr-52 rounded-md" />
  </div>
);

const Body = async (props: Props) => {
  const artist = await getArtist(props);
  if (artist.status !== "ok") {
    return null;
  }

  const { bio } = artist;
  const [firstParagraph, ...rest] = (bio ?? "")
    .split("\n\n")
    .filter((t) => t.trim() !== "");
  return (
    <>
      {firstParagraph && (
        <p
          className={`
            font-normal text-base mt-8 lg:mt-16 first-letter:font-display
            first-letter:text-3xl first-letter:ml-4
          `}
        >
          {firstParagraph}
        </p>
      )}
      {rest.map((text, i) => (
        <p key={i} className={`font-normal text-base mt-2`}>
          {text}
        </p>
      ))}
    </>
  );
};

const Bio = (props: Props) => (
  <div className={`px-8 pb-12`}>
    <Suspense
      key={`${props.volume}/${props.url}`}
      fallback={<BodyPlaceholder />}
    >
      <Body {...props} />
    </Suspense>
    <div className={`mt-24 ml-8 h-1 bg-red`} />
  </div>
);
export default Bio;
