import { baseURL } from "@/api";
import AlbumCard from "@/components/AlbumCard";
import { API } from "@scruffy/server";
import Link from "next/link";

const HomeBlock = ({
  title,
  children,
}: React.PropsWithChildren<{
  title: string;
}>) => (
  <div>
    <div className="text-center mb-8 uppercase text-xs">{title}</div>
    <div className="text-center text-sm">{children}</div>
  </div>
);

const ScruffLink = ({ children }: React.PropsWithChildren) => (
  <Link className="font-bold text-white" href="https://www.scaruffi.com">
    {children}
  </Link>
);

const PageHeader = () => (
  <div className="mx-auto max-w-md pt-24 pb-28">
    <h1 className={`mb-9 text-center text-6xl font-bold select-none`}>
      Scruffy2.0
    </h1>
    <p className="mx-auto font-light text-center">
      In which I attempt to organize the award winning music, film, political
      and scientific historian Scaruffi&apos;s knowledge base of film and music.
    </p>
  </div>
);

const About = () => (
  <div className="bg-black text-dark-white pt-10 pb-12 text-center px-8">
    <div className="max-w-screen-lg mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
      <HomeBlock title="What is this?">
        This site collects or attempts to collect all reviews, biographies and
        ratings for film and music by <ScruffLink>Piero Scaruffi</ScruffLink>{" "}
        and present an interface that allows you, dear user, to search said
        biographies and ratings for film and music.
      </HomeBlock>
      <HomeBlock title="But how?">
        The server will periodically crawl <ScruffLink>scaruffi.com</ScruffLink>{" "}
        to detect new ratings or artists and add or detect changes in exsting
        artists and update them. The interval is fairly large and all requests
        to the website are rate limited so as to not overload the server. The
        process is automated so I urge you to visite{" "}
        <ScruffLink>scaruffi.com</ScruffLink> for the definitive data.
      </HomeBlock>
      <HomeBlock title="But why?">
        <ScruffLink>scaruffi.com</ScruffLink> is fairly messy and archaic. This
        hopefully makes it easier to explore all things Scaruffi. The actual
        reason is it&apos;s a fun little project and I have been a fan of{" "}
        <ScruffLink>Scaruffi</ScruffLink> for a long time and discovering his
        website was a formative experience in my musical discovery journey.
      </HomeBlock>
    </div>
  </div>
);

const getData = async () => {
  const { data: newest }: API["/album"]["/"] = await (
    await fetch(`${baseURL}/album?itemsPerPage=5&sort=lastUpdated`)
  ).json();

  const { data: bnm }: API["/album"]["/"] = await (
    await fetch(`${baseURL}/album?itemsPerPage=1&sort=lastUpdated&ratingMin=8`)
  ).json();

  return { bnm: bnm?.[0], newest };
};

const Latest = async () => {
  const { bnm, newest } = await getData();
  return (
    <div className="max-w-screen-lg mx-auto pt-20 mb-20 px-8">
      <div className="flex flex-col-reverse md:flex-row gap-8">
        <div className="flex-1">
          <h2 className="font-display font-bold text-2xl mb-8">
            Latest Reviews
          </h2>
          <div>
            {newest.map((a) => (
              <AlbumCard
                className="mb-4"
                key={`${a.artist.url}-${a.name}`}
                {...a}
              />
            ))}
          </div>
        </div>
        <div className="w-full md:w-[300px] flex-0 min-w-fit">
          <h2 className="font-display font-bold text-2xl mb-8">
            Best New Music
          </h2>
          <AlbumCard
            layout="vertical"
            textSize="xl"
            className={`!grid-rows-[300px_minmax(7.5rem,_1fr)] !h-auto mx-auto`}
            {...bnm}
          />
        </div>
      </div>
    </div>
  );
};

export default function Home() {
  return (
    <div className={`min-h-fullscreen`}>
      <PageHeader />
      <About />
      <Latest />
    </div>
  );
}
