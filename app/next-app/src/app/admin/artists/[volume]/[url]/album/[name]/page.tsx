import { isLoggedIn } from "@/app/actions";
import Input from "@/components/Input";
import { RedirectType, redirect } from "next/navigation";
import OriginalAlbum from "./Components/OriginalAlbum";
import { updaterBaseURL } from "@/api";
import { revalidateTag } from "next/cache";
import { headers } from "next/headers";
import { Suspense } from "react";
import { getArtistName } from "@/app/artists/[volume]/[url]/api";
import BlockContainer from "@/components/BlockContainer";
import ProviderInformation from "./Components/ProviderInformation";

type Props = {
  params: { volume: string; url: string; name: string };
  searchParams: Record<string, string>;
};

const submitSelection = async (formData: FormData) => {
  "use server";
  if (!(await isLoggedIn())) {
    return redirect("/login", RedirectType.replace);
  }

  const referer = formData.get("referer");

  const includeName = formData.get("include-name");
  const includeImage = formData.get("include-img");
  const includeYear = formData.get("include-year");

  const vol = formData.get("vol");
  const url = formData.get("url");
  const originalName = formData.get("name");

  const selected = formData.get("selectedArtist");
  if (
    typeof selected !== "string" ||
    typeof vol !== "string" ||
    typeof url !== "string" ||
    typeof originalName !== "string"
  ) {
    return;
  }

  const {
    name,
    coverURL,
    releaseYear,
  }: { name: string; coverURL?: string; releaseYear?: number } =
    JSON.parse(selected);

  const update = {
    name: includeName ? name : undefined,
    imageUrl: includeImage ? coverURL : undefined,
    year: includeYear ? releaseYear : undefined,
  };

  const resp = await fetch(
    `${updaterBaseURL}/artist/${vol}/${url}/album/${encodeURIComponent(
      originalName,
    )}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(update),
    },
  );
  if (resp.status === 204) {
    revalidateTag("albums");
    revalidateTag("artists");

    return redirect(
      typeof referer === "string" ? referer : `/artists/${vol}/${url}`,
      RedirectType.push,
    );
  }
};

const SelectInputs = () => (
  <BlockContainer className="col-span-4 flex flex-row justify-between items-center">
    <fieldset className="flex flex-row gap-2 items-center">
      <span>Fields to update:</span>
      {[
        { value: "include-name", label: "Name" },
        { value: "include-img", label: "Image", checked: true },
        { value: "include-year", label: "Release Year", checked: true },
      ].map(({ value, label, checked }) => (
        <div key={value} className="group">
          <input
            id={value}
            type="checkbox"
            name={value}
            value={value}
            defaultChecked={checked}
          />
          <label className="ml-1" htmlFor={value}>
            {label}
          </label>
        </div>
      ))}
    </fieldset>
    <button type="submit">Select</button>
  </BlockContainer>
);

const Search = async ({
  searchParams,
  volume,
  url,
  name,
}: Pick<Props, "searchParams"> & Props["params"]) => {
  "use server";

  const Inputs = ({
    albumName,
    artistName,
    referer,
  }: {
    albumName?: string;
    artistName?: string;
    referer?: string;
  }) => (
    <>
      <input
        name="referer"
        hidden
        defaultValue={searchParams.referer ?? referer}
      />
      <Input
        name="artist"
        className="flex-1"
        type="text"
        placeHolder="Search a different artist"
        defaultValue={searchParams.artist ?? artistName}
      />
      <Input
        name="name"
        className="flex-1"
        type="text"
        placeHolder="Search a different album"
        defaultValue={searchParams.name ?? albumName}
      />
    </>
  );

  const AsyncInputs = async () => {
    const referer = headers().get("referer");
    const { name: artistName } = await getArtistName({ volume, url });

    return (
      <Inputs
        referer={referer ?? undefined}
        artistName={artistName}
        albumName={decodeURIComponent(name)}
      />
    );
  };

  return (
    <BlockContainer className="col-span-4">
      <form className="flex items-center gap-2" method="get">
        <Suspense fallback={<Inputs />}>
          <AsyncInputs />
        </Suspense>
        <button type="submit">Search</button>
      </form>
    </BlockContainer>
  );
};

export default async function AlbumCorrection({ params, searchParams }: Props) {
  const referer = headers().get("referer");
  const albumName = !!searchParams.name ? searchParams.name : undefined;
  const artistName = !!searchParams.artist ? searchParams.artist : undefined;

  return (
    <main>
      <div
        className={`
          grid grid-cols-[22rem_1fr_1fr_1fr_1fr] p-4 grid-rows-[82px_82px_1fr]
          gap-4
        `}
      >
        <BlockContainer className="row-span-4 w-[22rem]" title="Original data">
          <OriginalAlbum
            artist={{ vol: params.volume, url: params.url }}
            name={params.name}
          />
        </BlockContainer>
        <Search {...params} searchParams={searchParams} />
        <form action={submitSelection} className="contents">
          <input name="vol" hidden defaultValue={params.volume} />
          <input name="url" hidden defaultValue={params.url} />
          <input name="name" hidden defaultValue={params.name} />
          <input
            name="referer"
            hidden
            defaultValue={searchParams.referer ?? referer}
          />
          <SelectInputs />
          <ProviderInformation
            provider="musicbrainz"
            label="MusicBrainz"
            params={params}
            albumSearch={albumName}
            artistSearch={artistName}
          />
          <ProviderInformation
            provider="spotify"
            label="Spotify"
            params={params}
            albumSearch={albumName}
            artistSearch={artistName}
          />
          <ProviderInformation
            provider="deezer"
            label="Deezer"
            params={params}
            albumSearch={albumName}
            artistSearch={artistName}
          />
          <ProviderInformation
            provider="lastfm"
            label="last.fm"
            params={params}
            albumSearch={albumName}
            artistSearch={artistName}
          />
        </form>
      </div>
    </main>
  );
}
