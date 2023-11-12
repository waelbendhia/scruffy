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
        : await searchArtists({
            name: debouncedSearch,
            itemsPerPage: 3,
            sort: "name",
          }),
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
        `bg-transparent absolute left-0 top-10 z-0 w-full ` +
        `h-headless-screen transition-opacity ${
          open ? `visible opacity-100` : `invisible opacity-0`
        }`
      }
      onClick={() => toggleSearch()}
    >
      <div
        onClick={(e) => {
          e.stopPropagation();
        }}
        className={
          `px-8 pt-4 w-almost-full absolute left-8 h-[43rem] top-2 shadow-md ` +
          `bg-white-transparent backdrop-blur-sm flex flex-col transition-all z-10 ` +
          `rounded mb-4 ${open ? "translate-y-0" : "translate-y-8"}`
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
    </div>
  );
};

export default SearchBar;
