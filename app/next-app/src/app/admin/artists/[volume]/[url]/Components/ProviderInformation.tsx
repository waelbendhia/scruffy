import { updaterBaseURL } from "@/api";
import { getArtist } from "@/app/artists/[volume]/[url]/api";
import { ArtistResult } from "@scruffy/updater";
import SearchResult from "./SearchResult";
import { Suspense } from "react";

type Params = { volume: string; url: string };

const getProviderData = async (provider: string, name: string) => {
  const resp = await fetch(
    `${updaterBaseURL}/${provider}/artist/${encodeURIComponent(name)}`,
  );
  const res: ArtistResult[] = await resp.json();

  return res;
};

type Props = {
  params: Params;
  provider: string;
  label: string;
  searchValue?: string;
};

const ProviderInformationAsync = async ({
  provider,
  label,
  params,
  searchValue,
}: Props) => {
  let name = searchValue;
  if (!name) {
    const artist = await getArtist(params);
    if (artist.status !== "ok") {
      throw "This should never throw";
    }
    name = artist.name;
  }

  const results = await getProviderData(provider, name);
  console.log(provider, results);

  return <SearchResult source={label} loading={false} results={results} />;
};

export default function ProviderInformation(props: Props) {
  return (
    <Suspense fallback={<SearchResult loading source={props.label} />}>
      <ProviderInformationAsync {...props} />
    </Suspense>
  );
}
