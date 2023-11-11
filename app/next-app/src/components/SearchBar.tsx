import React from "react";
import Input from "./Input";
import ArtistCard from "@/components/ArtistCard";
import AlbumCard from "@/components/AlbumCard";
import { useQuery } from "react-query";
import { searchAlbums, searchArtists } from "@/api";
import Loading from "./Loading";
import { useDebounced } from "@/hooks";

const SearchBar = ({
  open,
  toggleSearch,
}: {
  open: boolean;
  toggleSearch: (open?: boolean) => void;
}) => {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [search, setSearch] = React.useState("");
  const debouncedSearch = useDebounced(search, 200);
  const artistQueryResult = useQuery(
    ["artist-search", debouncedSearch],
    async () =>
      !debouncedSearch
        ? { data: [], total: 0 }
        : await searchArtists({ name: debouncedSearch, itemsPerPage: 3 }),
    { keepPreviousData: true },
  );

  const albumQueryResult = useQuery(
    ["album-search", debouncedSearch],
    async () =>
      !debouncedSearch
        ? { data: [], total: 0 }
        : await searchAlbums({ name: debouncedSearch, itemsPerPage: 3 }),
    { keepPreviousData: true },
  );

  React.useEffect(() => {
    if (!open) setSearch("");
    else inputRef.current?.focus();
  }, [open]);

  React.useEffect(() => {
    if (!open) {
      return;
    }

    const listener = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        toggleSearch(false);
      }
    };

    document.addEventListener("keydown", listener);

    return () => document.removeEventListener("keydown", listener);
  }, [toggleSearch, open]);

  const colClass = "grid grid-cols-1 grid-rows-3 gap-y-2 py-2";

  return (
    <div
      className={
        `px-8 pt-4 w-almost-full absolute left-8 h-[688px] top-12 shadow-md ` +
        `bg-white-transparent backdrop-blur-sm flex flex-col transition-all z-10 ` +
        `rounded mb-4 ${
          open
            ? "translate-y-0 opacity-100 visible"
            : "translate-y-8 opacity-0 invisible"
        }`
      }
    >
      <Input
        ref={inputRef}
        className="h-10 mr-9"
        whiteText={true}
        icon="search"
        type="text"
        value={search}
        onChange={setSearch}
      />
      <Loading
        loading={
          artistQueryResult.isLoading ||
          artistQueryResult.isFetching ||
          albumQueryResult.isLoading ||
          albumQueryResult.isFetching
        }
        className="flex-1 grid grid-cols-2 gap-x-2"
      >
        <div className={colClass}>
          {artistQueryResult.data?.data?.map((b) => (
            <ArtistCard key={b.url} {...b} />
          ))}
        </div>
        <div className={colClass}>
          {albumQueryResult.data?.data.map((a) => (
            <AlbumCard key={`${a.artist.url}-${a.name}`} {...a} />
          ))}
        </div>
      </Loading>
    </div>
  );
};

export default SearchBar;
