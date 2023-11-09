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
      style={{
        transition: "height 0s linear",
      }}
      className={
        `flex left-0 absolute flex-col items-center ${
          open ? "h-minus-header opacity-1" : "h-0 opacity-0"
        } top-header w-full bg-black-transparent overflow-hidden focus:outline-none ` +
        `transition-all`
      }
    >
      <div
        className={`px-8 w-almost-full left-2 ${
          open ? "h-7/10" : "h-0"
        } bg-black transition-all grid grid-cols-2 grid-rows-fixed-10 gap-w`}
      >
        <Input
          ref={inputRef}
          whiteText={true}
          className={`text-white col-span-2 transition-opacity ${
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
              whiteText={true}
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
              whiteText={true}
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
      <div className={"flex-1"} onClick={() => toggleSearch()} />
    </div>
  );
};

export default SearchBar;
