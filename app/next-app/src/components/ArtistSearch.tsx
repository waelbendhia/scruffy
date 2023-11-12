"use client";

// TODO: since we're using this for artist and search rename this component

import { useArtistSearchParams, useDebouncedEffect } from "@/hooks";
import Input from "@/components/Input";
import React from "react";

const ArtistSearch = ({ className = "" }) => {
  const inputRef = React.useRef<HTMLInputElement>(null);
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
  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <Input
      className={className}
      ref={inputRef}
      icon="search"
      placeHolder="Search"
      type="text"
      value={name ?? ""}
      onChange={(name) => setName(name)}
    />
  );
};

export default ArtistSearch;
