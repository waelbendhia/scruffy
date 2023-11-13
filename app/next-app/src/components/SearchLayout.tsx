import ArtistSearch from "@/components/ArtistSearch";
import Paginator from "@/components/Paginator";

type Props<T> = {
  data: T[];
  total: number;
  page: number;
  searchName?: string;
  renderRow: (_: T) => React.ReactElement;
  filters?: React.ReactElement;
  colNumber?: 4 | 3;
};

export default async function SearchLayout<T>({
  searchName,
  data,
  total,
  page,
  filters,
  renderRow,
  colNumber = 3,
}: Props<T>) {
  const offset = page * 12;

  return (
    <>
      <div
        className={`flex gap-2 items-center flex-row py-4 max-w-screen-2xl mx-auto`}
      >
        <ArtistSearch className="flex-1" />
      </div>
      <div
        className={
          `max-w-screen-xl h-8 leading-8 px-1 mx-auto ` +
          `border-b-black-transparent border-b`
        }
      >
        {total > 0 ? (
          <>
            Showing results <b>{offset + 1}</b> to <b>{offset + data.length}</b>{" "}
            of <b>{total}</b>{" "}
            {searchName && (
              <>
                for <i>&apos;{searchName}&apos;</i>
              </>
            )}
          </>
        ) : (
          <>
            No results found for <i>&apos;{searchName}&apos;</i>
          </>
        )}
      </div>
      <div className={`max-w-screen-xl mx-auto`}>{filters}</div>
      <div
        className={
          `grid ${
            colNumber === 4
              ? `sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4`
              : `sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
          } gap-2 md:gap-4 lg:gap-8 max-w-screen-xl mx-auto`
        }
      >
        {data.map(renderRow)}
      </div>
      {total > 0 && <Paginator className={`mb-4`} total={total} />}
    </>
  );
}
