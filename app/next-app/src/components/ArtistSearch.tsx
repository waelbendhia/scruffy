"use client";

import { useArtistSearchParams } from "@/hooks";

const ArtistSearch = () => {
  const [search, setSearch] = useArtistSearchParams();
  return (
    <div>
      {search.name}
      <input onChange={(e) => setSearch({ ...search, name: e.target.value })} />
    </div>
  );
};

export default ArtistSearch;
