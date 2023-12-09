import ArtistCard from "@/components/ArtistCard";
import SearchResultItem from "./SearchResultItem";
import BlockContainer from "@/components/BlockContainer";
import { SearchResult as SR } from "../../types";

type ArtistResult = { name: string; imageUrl?: string; id: string };

type Props = { source: string; className?: string } & (
  | {
      loading: true;
    }
  | {
      loading: false;
      results: SR<ArtistResult>;
    }
);

const InputContainer = ({ children }: React.PropsWithChildren) => (
  <div className="flex gap-4 overflow-hidden">{children}</div>
);

const Message = ({ children }: React.PropsWithChildren) => (
  <div className="text-xl text-center h-32 flex text-dark-gray">
    <span className="m-auto">{children}</span>
  </div>
);

const LoadingResults = () => (
  <div>
    {Array.from({ length: 4 }).map((_, i) => (
      <InputContainer key={i}>
        <input className="w-4" type="radio" disabled />
        <ArtistCard
          layout="horizontal"
          className="h-48 my-2"
          imageClassName="w-48"
          loading
        />
      </InputContainer>
    ))}
  </div>
);

const ActualResults = ({ data }: { data: ArtistResult[] }) => (
  <fieldset className="contents">
    {data.length > 0 ? (
      data.map((r) => (
        <InputContainer key={r.id}>
          <input
            type="radio"
            id={r.id}
            name="selectedArtist"
            value={JSON.stringify(r)}
          />
          <label className="group" htmlFor={r.id}>
            <SearchResultItem name={r.name} imageUrl={r.imageUrl} />
          </label>
        </InputContainer>
      ))
    ) : (
      <Message>No results</Message>
    )}
  </fieldset>
);

const SearchResult = ({ className, source, ...props }: Props) => {
  return (
    <BlockContainer
      className={`${className ?? ""} w-full`}
      title={<>Results for {source}</>}
    >
      {props.loading ? (
        <LoadingResults />
      ) : (
        <fieldset className="contents">
          {props.results.status === "ok" ? (
            <ActualResults data={props.results.data} />
          ) : (
            <Message>
              {props.results.status === "disabled"
                ? `${source} is disabled`
                : props.results.status === "timed out"
                  ? `${source} timed out`
                  : `${source} failed`}
            </Message>
          )}
        </fieldset>
      )}
    </BlockContainer>
  );
};

export default SearchResult;
