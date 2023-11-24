import { isLoggedIn } from "@/app/actions";
import BlockContainer from "../../Components/BlockContainer";
import Input from "@/components/Input";
import { RedirectType, redirect } from "next/navigation";
import OriginalAlbum from "./Components/OriginalAlbum";
import DeezerInformation from "./Components/DeezerInformation";
import SpotifyInformation from "./Components/SpotifyInformation";
import LastFMInformation from "./Components/LastFMInformation";
import { updaterBaseURL } from "@/api";
import { revalidateTag } from "next/cache";

type Props = {
  params: { volume: string; url: string; name: string };
  searchParams: Record<string, string>;
};

const submitSelection = async (formData: FormData) => {
  "use server";
  if (!(await isLoggedIn())) {
    return redirect("/login", RedirectType.replace);
  }

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
    console.warn("invalid update data", { selected, vol, url });
    return;
  }

  const {
    name,
    imageUrl,
    year,
  }: { name: string; imageUrl?: string; year?: number } = JSON.parse(selected);

  const update = {
    name: includeName ? name : undefined,
    imageUrl: includeImage ? imageUrl : undefined,
    year: includeYear ? year : undefined,
  };

  console.log(selected);
  console.log(update);
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
    revalidateTag("artists");
    return redirect(`/artists/${vol}/${url}`, RedirectType.push);
  }
};

const SelectInputs = () => (
  <>
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
  </>
);

export default function AlbumCorrection({ params, searchParams }: Props) {
  const albumName = searchParams.name;
  const artistName = searchParams.artist;

  return (
    <main>
      <div
        className={`
          grid grid-cols-[22rem_1fr_1fr_1fr] gap-4 p-4 grid-rows-[82px_82px_1fr]
        `}
      >
        <BlockContainer className="row-span-3 w-[22rem]" title="Original data">
          <OriginalAlbum
            artist={{ vol: params.volume, url: params.url }}
            name={params.name}
          />
        </BlockContainer>
        <BlockContainer className="col-span-3">
          <form className="flex items-center gap-2" method="get">
            <Input
              name="artist"
              className="flex-1"
              type="text"
              placeHolder="Search a different artist"
              defaultValue={artistName}
            />
            <Input
              name="name"
              className="flex-1"
              type="text"
              placeHolder="Search a different album"
              defaultValue={albumName}
            />
            <button type="submit">Search</button>
          </form>
        </BlockContainer>
        <form action={submitSelection} className="contents">
          <input name="vol" hidden defaultValue={params.volume} />
          <input name="url" hidden defaultValue={params.url} />
          <input name="name" hidden defaultValue={params.name} />
          <BlockContainer className="col-span-3 flex flex-row justify-between items-center">
            <SelectInputs />
          </BlockContainer>
          <DeezerInformation
            params={params}
            albumSearch={albumName}
            artistSearch={artistName}
          />
          <SpotifyInformation
            params={params}
            albumSearch={albumName}
            artistSearch={artistName}
          />
          <LastFMInformation
            params={params}
            albumSearch={albumName}
            artistSearch={artistName}
          />
        </form>
      </div>
    </main>
  );
}
