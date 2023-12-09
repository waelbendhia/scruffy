import AlbumCard from "@/components/AlbumCard";
import SearchResultItem from "./SearchResultItem";
import BlockContainer from "@/components/BlockContainer";
import { AlbumResult } from "@scruffy/updater";
import { SearchResult as SR } from "../../../../types";

type Props = { source: string; className?: string } & (
  | {
      loading: true;
    }
  | {
      loading: false;
      results: SR<AlbumResult>;
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
        <AlbumCard
          layout="horizontal"
          className="h-32 my-2"
          imageClassName="w-32"
          loading
        />
      </InputContainer>
    ))}
  </div>
);

const ActualResults = ({ data }: { data: AlbumResult[] }) => (
  <fieldset className="contents">
    {data.length > 0 ? (
      data.map((r) => (
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
      title={`Results for ${source}`}
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
