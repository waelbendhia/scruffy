import DeezerInformation from "./Components/DeezerInformation";
import SpotifyInformation from "./Components/SpotifyInformation";
import BlockContainer from "./Components/BlockContainer";
import Bio from "@/app/artists/[volume]/[url]/components/Bio";
import Header from "@/app/artists/[volume]/[url]/components/Header";
import { updaterBaseURL } from "@/api";
import { redirect, RedirectType } from "next/navigation";
import { isLoggedIn } from "@/app/actions";
import { revalidateTag } from "next/cache";
import Input from "@/components/Input";

type Props = {
  params: { volume: string; url: string };
  searchParams: Record<string, string>;
};

const submitSelection = async (formData: FormData) => {
  "use server";
  if (!(await isLoggedIn())) {
    return redirect("/login", RedirectType.replace);
  }

  const fields = formData.get("fields");
  const vol = formData.get("vol");
  const url = formData.get("url");
  const selected = formData.get("selectedArtist");
  if (
    typeof selected !== "string" ||
    typeof vol !== "string" ||
    typeof url !== "string" ||
    (fields !== "name-only" && fields !== "img-only" && fields !== "both")
  ) {
    console.warn("invalid update data", { selected, vol, url, fields });
    return;
  }
  const { name, imageUrl }: { name: string; imageUrl?: string } =
    JSON.parse(selected);
  const artist =
    fields === "both"
      ? { name, imageUrl }
      : fields === "name-only"
      ? { name }
      : { imageUrl };

  const resp = await fetch(`${updaterBaseURL}/artist/${vol}/${url}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(artist),
  });
  if (resp.status === 204) {
    revalidateTag("artists");
    return redirect(`/artists/${vol}/${url}`, RedirectType.push);
  }

  // TODO: indicate error somehow
};

const SelectInputs = () => (
  <>
    <fieldset className="flex flex-row gap-2 items-center">
      <span>Fields to update:</span>
      {[
        { value: "name-only", label: "Only name" },
        { value: "img-only", label: "Only image" },
        { value: "both", label: "Both", checked: true },
      ].map(({ value, label, checked }) => (
        <div key={value} className="group">
          <input
            id={value}
            type="radio"
            name="fields"
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
  </>
);

export default async function ArtistCorrect({ params, searchParams }: Props) {
  const searchValue = searchParams.name;

  return (
    <main>
      <div className={`grid grid-cols-3 gap-4 p-4 grid-rows-[82px_82px_1fr]`}>
        <BlockContainer
          className="px-0 [&>h3]:px-4 row-span-3"
          title="Original data"
        >
          <Header {...params} />
          <Bio {...params} />
        </BlockContainer>
        <BlockContainer className="col-span-2">
          <form className="flex items-center gap-2" method="get">
            <Input
              name="name"
              className="flex-1"
              type="text"
              placeHolder="Search by a different name"
              defaultValue={searchValue}
            />
            <button type="submit">Search</button>
          </form>
        </BlockContainer>
        <form action={submitSelection} className="contents">
          <input name="vol" hidden defaultValue={params.volume} />
          <input name="url" hidden defaultValue={params.url} />
          <BlockContainer className="col-span-2 flex flex-row justify-between items-center">
            <SelectInputs />
          </BlockContainer>
          <DeezerInformation params={params} searchValue={searchValue} />
          <SpotifyInformation params={params} searchValue={searchValue} />
        </form>
      </div>
    </main>
  );
}
