import AlbumCard from "@/components/AlbumCard";
import SearchResultItem from "./SearchResultItem";
import BlockContainer from "@/components/BlockContainer";
import { AlbumResult } from "@scruffy/updater";

type Props = { source: string; className?: string } & (
  | {
      loading: true;
    }
  | {
      loading: false;
      results: AlbumResult[];
    }
);

const InputContainer = ({ children }: React.PropsWithChildren) => (
  <div className="flex gap-4 overflow-hidden">{children}</div>
);

const SearchResult = ({ className, source, ...props }: Props) => {
  return (
    <BlockContainer
      className={`${className ?? ""} w-full`}
      title={<>Results for {source}</>}
    >
      {props.loading ? (
        <div>
          {Array.from({ length: 4 }).map((_, i) => (
            <InputContainer key={i}>
              <input className="w-4" type="radio" disabled />
              <AlbumCard
                layout="horizontal"
                className={`h-32 my-2`}
                imageClassName="w-32"
                loading
              />
            </InputContainer>
          ))}
        </div>
      ) : (
        <fieldset className="contents">
          {props.results.map((r) => (
            <InputContainer key={r.id}>
              <input
                type="radio"
                id={r.id}
                name="selectedArtist"
                value={JSON.stringify({ ...r, year: r.releaseYear })}
              />
              <label className="group" htmlFor={r.id}>
                <SearchResultItem
                  artistName={r.artistName}
                  name={r.name}
                  year={r.releaseYear}
                  imageUrl={r.coverURL}
                />
              </label>
            </InputContainer>
          ))}
        </fieldset>
      )}
    </BlockContainer>
  );
};

export default SearchResult;
