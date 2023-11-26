import ArtistCard from "@/components/ArtistCard";
import SearchResultItem from "./SearchResultItem";
import BlockContainer from "@/components/BlockContainer";

type Props = { source: string; className?: string } & (
  | {
      loading: true;
    }
  | {
      loading: false;
      results: { name: string; imageUrl?: string; key: string }[];
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
              <ArtistCard
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
                <SearchResultItem name={r.name} imageUrl={r.imageUrl} />
              </label>
            </InputContainer>
          ))}
        </fieldset>
      )}
    </BlockContainer>
  );
};

export default SearchResult;
