import React from "react";
import Input from "./Input";
import LabeledImage from "./LabeledImage";
import { useQuery } from "react-query";
import { searchAlbums, searchArtists } from "@/api";

const SearchBar = ({
  open,
  toggleSearch,
}: {
  open: boolean;
  toggleSearch: (open?: boolean) => void;
}) => {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [search, setSearch] = React.useState("");
  const artistQueryResult = useQuery(
    ["artist-search", search],
    () => searchArtists({ name: search, itemsPerPage: 3 }),
    { enabled: !!search },
  );

  const albumQueryResult = useQuery(
    ["album-search", search],
    () => searchAlbums({ name: search, itemsPerPage: 3 }),
    { enabled: !!search },
  );

  React.useEffect(() => {
    if (!open) {
      setSearch("");
    } else {
      inputRef.current?.focus();
    }
  }, [open]);

  React.useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        toggleSearch(false);
      }
    };

    document.addEventListener("keydown", listener);

    return () => document.removeEventListener("keydown", listener);
  }, [toggleSearch]);

  return (
    <div
      className={
        `px-8 pt-4 w-almost-full absolute left-8 h-[70vh] top-header ${
          open
            ? "translate-y-0 opacity-100 visible"
            : "translate-y-8 opacity-0 invisible"
        } bg-white-transparent backdrop-blur-sm transition-all grid grid-cols-2 ` +
        `grid-rows-fixed-10 gap-w`
      }
    >
      <Input
        ref={inputRef}
        whiteText={true}
        className={`col-span-2 transition-opacity ${
          open ? "" : "pointer-events-none opacity-0"
        }`}
        icon="search"
        type="text"
        value={search}
        onChange={setSearch}
      />
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
    </div>
  );
};

export default SearchBar;
