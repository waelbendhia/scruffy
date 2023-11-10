"use client";

import { useArtistSearchParams, useDebounced } from "@/hooks";
import Input from "@/components/Input";
import React from "react";

const ArtistSearch = () => {
  const [search, setSearch] = useArtistSearchParams();
  const [name, setName] = React.useState(search.name);
  const debouncedName = useDebounced(name);
  React.useEffect(() => {
    setSearch((prev) => ({ ...prev, name: debouncedName }));
  }, [debouncedName, setSearch]);

  return (
    <Input type="text" value={name ?? ""} onChange={(name) => setName(name)} />
  );
};

export default ArtistSearch;
