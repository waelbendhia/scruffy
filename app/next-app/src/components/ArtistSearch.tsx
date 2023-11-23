"use client";

// TODO: since we're using this for artist and search rename this component

import { useDebouncedEffect, useQueryParams } from "@/hooks";
import Input from "@/components/Input";
import React from "react";

type Props = { className?: string };

const ArtistSearch = ({ className = "" }: Props) => {
  const inputRef = React.useRef<HTMLInputElement>(null);

  const [searchParams, setSearchParams] = useQueryParams();
  const searchName = searchParams.get("name");
  const [name, setName] = React.useState(searchName);

  const cbSearch = React.useCallback(
    (newName: string | null) => {
      if (newName === searchName) return;
      const newParams = new URLSearchParams(searchParams);

      if (newName !== null) newParams.set("name", newName);
      else newParams.delete("name");

      newParams.set("page", '0');

      setSearchParams(newParams);
    },
    [searchName, searchParams, setSearchParams],
  );

  useDebouncedEffect(name, cbSearch, 250);

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
