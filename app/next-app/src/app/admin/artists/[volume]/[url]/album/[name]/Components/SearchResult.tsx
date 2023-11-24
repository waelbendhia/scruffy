import AlbumCard from "@/components/AlbumCard";
import SearchResultItem from "./SearchResultItem";
import BlockContainer from "../../../Components/BlockContainer";

type Props = { source: string; className?: string } & (
  | {
      loading: true;
    }
  | {
      loading: false;
      results: {
        artistName: string;
        name: string;
        imageUrl?: string;
        year?: string;
        key: string | number;
      }[];
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
                className={`h-48 my-2`}
                imageClassName="w-48"
                loading
              />
            </InputContainer>
          ))}
        </div>
      ) : (
        <fieldset className="contents">
          {props.results.map((r) => (
            <InputContainer key={r.key}>
              <input
                type="radio"
                id={r.key}
                name="selectedArtist"
                value={JSON.stringify(r)}
              />
              <label className="group" htmlFor={r.key}>
                <SearchResultItem
                  artistName={r.artistName}
                  name={r.name}
                  year={r.year}
                  imageUrl={r.imageUrl}
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
