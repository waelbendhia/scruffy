"use client";

import { useArtistSearchParams, useDebouncedEffect } from "@/hooks";
import Input from "@/components/Input";
import React from "react";

const ArtistSearch = () => {
  const [search, setSearch] = useArtistSearchParams();
  const [name, setName] = React.useState(search.name);
  const cbSearch = React.useCallback(
    (newName?: string) => {
      if (search.name !== newName) {
        console.log(`setting ${newName}`);
        setSearch((prev) => ({ ...prev, name: newName }));
      }
    },
    [setSearch, search],
  );
  useDebouncedEffect(name, cbSearch);

  return (
    <Input type="text" value={name ?? ""} onChange={(name) => setName(name)} />
  );
};

export default ArtistSearch;
