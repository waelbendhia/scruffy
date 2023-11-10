import React from "react";
import Input from "./Input";
import LabeledImage from "./LabeledImage";
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

  return (
    <div
      className={`px-8 pt-4 w-almost-full absolute left-8 h-[70vh] top-header ${
        open
          ? "translate-y-0 opacity-100 visible"
          : "translate-y-8 opacity-0 invisible"
      } bg-white-transparent backdrop-blur-sm flex flex-col`}
    >
      <Input
        ref={inputRef}
        className="h-10"
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
        className="flex-1 grid grid-cols-2"
      >
        <div className={"grid grid-cols-1 grid-rows-3"}>
          {artistQueryResult.data?.data?.map((b) => (
            <LabeledImage
              key={b.name}
              url={b.url}
              imageUrl={b.imageUrl ?? "/artist-default.svg"}
            >
              <div className={"overflow-hidden text-ellipsis"}>{b.name}</div>
            </LabeledImage>
          ))}
        </div>
        <div className={"grid grid-cols-1 grid-rows-3"}>
          {albumQueryResult.data?.data.map((a) => (
            <LabeledImage
              key={a.name}
              url={a.artist.url}
              imageUrl={a.imageUrl ?? "/album-default.svg"}
            >
              <div className={"overflow-hidden"}>
                <div className="overflow-hidden text-ellipsis">
                  {a.artist.name}
                </div>
                <div className="overflow-hidden text-ellipsis">
                  <b>{a.name}</b>
                </div>
              </div>
            </LabeledImage>
          ))}
        </div>
      </Loading>
    </div>
  );
};

export default SearchBar;
