import ProviderInformation from "./Components/ProviderInformation";
import Bio from "@/app/artists/[volume]/[url]/components/Bio";
import Header from "@/app/artists/[volume]/[url]/components/Header";
import { updaterBaseURL } from "@/api";
import { redirect, RedirectType } from "next/navigation";
import { isLoggedIn } from "@/app/actions";
import { revalidateTag } from "next/cache";
import Input from "@/components/Input";
import { headers } from "next/headers";
import { Suspense } from "react";
import { getArtistName } from "@/app/artists/[volume]/[url]/api";
import BlockContainer from "@/components/BlockContainer";

type Props = {
  params: { volume: string; url: string };
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

  const vol = formData.get("vol");
  const url = formData.get("url");
  const selected = formData.get("selectedArtist");
  if (
    typeof selected !== "string" ||
    typeof vol !== "string" ||
    typeof url !== "string"
  ) {
    console.warn("invalid update data", { selected, vol, url });
    return;
  }
  const { name, imageURL }: { name: string; imageURL?: string } =
    JSON.parse(selected);
  const artist = {
    name: includeName ? name : undefined,
    imageURL: includeImage ? imageURL : undefined,
  };

  const resp = await fetch(`${updaterBaseURL}/artist/${vol}/${url}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(artist),
  });
  if (resp.status === 204) {
    revalidateTag("artists");
    return redirect(
      typeof referer === "string" ? referer : `/artists/${vol}/${url}`,
      RedirectType.push,
    );
  }

  // TODO: indicate error somehow
};

const SelectInputs = ({ className = "" }) => (
  <BlockContainer
    className={`${className ?? ""} flex flex-row justify-between items-center`}
  >
    <fieldset className="flex flex-row gap-2 items-center">
      <span>Fields to update:</span>
      {[
        { value: "include-name", label: "Name" },
        { value: "include-img", label: "Image", checked: true },
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
  volume,
  url,
  searchParams,
  className = "",
}: Pick<Props, "searchParams"> & Props["params"] & { className?: string }) => {
  "use server";

  const NameInput = ({
    defaultValue,
    referer,
  }: {
    defaultValue?: string;
    referer?: string;
  }) => (
    <>
      <input
        name="referer"
        hidden
        defaultValue={searchParams.referer ?? referer}
      />
      <Input
        name="name"
        className="flex-1"
        type="text"
        placeHolder="Search by a different name"
        defaultValue={searchParams.name ?? defaultValue}
      />
    </>
  );

  const NameWithArtistValue = async () => {
    const name = await getArtistName({ volume, url });
    const referer = headers().get("referer");

    return <NameInput defaultValue={name} referer={referer ?? undefined} />;
  };

  return (
    <BlockContainer className={className}>
      <form className="flex items-center gap-2" method="get">
        <Suspense fallback={<NameInput />}>
          <NameWithArtistValue />
        </Suspense>
        <button type="submit">Search</button>
      </form>
    </BlockContainer>
  );
};

export default async function ArtistCorrect({ params, searchParams }: Props) {
  const referer = headers().get("referer");
  const searchValue = searchParams.name;

  return (
    <main>
      <div className="grid grid-cols-3 gap-4 p-4 grid-rows-[82px_82px_1fr]">
        <BlockContainer
          className="px-0 [&>h3]:px-4 row-span-3"
          title="Original data"
        >
          <Header {...params} />
          <Bio {...params} />
        </BlockContainer>
        <Search
          {...params}
          className="col-span-2"
          searchParams={searchParams}
        />
        <form action={submitSelection} className="contents">
          <input
            name="referer"
            hidden
            defaultValue={searchParams.referer ?? referer}
          />
          <input name="vol" hidden defaultValue={params.volume} />
          <input name="url" hidden defaultValue={params.url} />
          <SelectInputs className="col-span-2" />
          <ProviderInformation
            provider="deezer"
            label="Deezer"
            params={params}
            searchValue={searchValue}
          />
          <ProviderInformation
            provider="spotify"
            label="Spotify"
            params={params}
            searchValue={searchValue}
          />
        </form>
      </div>
    </main>
  );
}
