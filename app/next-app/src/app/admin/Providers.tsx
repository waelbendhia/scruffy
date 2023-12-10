import BlockContainer from "@/components/BlockContainer";
import Fields from "./Fields";
import { Suspense } from "react";
import { updaterBaseURL } from "@/api";
import { AlbumProviders, ArtistProviders } from "@scruffy/updater";
import AdminButton from "./Submit";
import { revalidateTag } from "next/cache";

const ArtistProvidersAsync = async () => {
  const resp = await fetch(`${updaterBaseURL}/providers/artist`, {
    next: { tags: ["providers"] },
  });
  const res: ArtistProviders = await resp.json();

  return (
    <Fields
      type="artist"
      labels={{ spotify: "Spotify", deezer: "Deezer" }}
      values={res}
    />
  );
};

const AlbumProvidersAsync = async () => {
  const resp = await fetch(`${updaterBaseURL}/providers/album`, {
    next: { tags: ["providers"] },
  });
  const res: AlbumProviders = await resp.json();

  return (
    <Fields
      type="album"
      labels={{
        spotify: "Spotify",
        deezer: "Deezer",
        musicbrainz: "MusicBrainz",
        lastfm: "last.fm",
      }}
      values={res}
    />
  );
};

const action = async (formData: FormData) => {
  "use server";

  const artist: ArtistProviders = {
    spotify: formData.get("artist-spotify") === "on",
    deezer: formData.get("artist-deezer") === "on",
  };

  const album: AlbumProviders = {
    spotify: formData.get("album-spotify") === "on",
    deezer: formData.get("album-deezer") === "on",
    musicbrainz: formData.get("album-musicbrainz") === "on",
    lastfm: formData.get("album-lastfm") === "on",
  };

  await Promise.all([
    fetch(`${updaterBaseURL}/providers/artist`, {
      method: "put",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(artist),
    }),
    fetch(`${updaterBaseURL}/providers/album`, {
      method: "put",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(album),
    }),
  ]);

  revalidateTag("providers");
};

const Providers = () => {
  return (
    <BlockContainer className="grid grid-cols-[max-content_1fr] gap-x-2 p-8 pt-4">
      <form action={action} className="contents">
        <h1 className="mb-4 col-span-2">Providers</h1>
        <h2 className="pl-2 col-span-2">Artist Providers</h2>
        <Suspense
          fallback={
            <Fields
              type="artist"
              labels={{ spotify: "Spotify", deezer: "Deezer" }}
            />
          }
        >
          <ArtistProvidersAsync />
        </Suspense>
        <h2 className="pl-2 col-span-2">Album Providers</h2>
        <Suspense
          fallback={
            <Fields
              type="album"
              labels={{
                spotify: "Spotify",
                deezer: "Deezer",
                musicbrainz: "MusicBrainz",
                lastfm: "last.fm",
              }}
            />
          }
        >
          <AlbumProvidersAsync />
        </Suspense>
        <AdminButton className="mt-4 col-span-2" type="submit">
          Update
        </AdminButton>
      </form>
    </BlockContainer>
  );
};

export default Providers;
