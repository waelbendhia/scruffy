import ArtistSearch from "@/components/ArtistSearch";
import Paginator from "@/components/Paginator";
import { Fragment, Suspense } from "react";

type Props<T> = {
  suspenseKey: string;
  prevTotal?: number;
  prevDataLength?: number;
  loadingPlaceholder: React.ReactNode;
  asyncData: Promise<{
    data: T[];
    total: number;
  }>;
  page: number;
  searchName?: string;
  renderRow: (_: T) => React.ReactElement;
  filters?: React.ReactElement;
  colNumber?: 4 | 3;
};

const TotalCount = ({
  total,
  offset,
  dataLength,
  searchName,
}: {
  total: number;
  dataLength: number;
  offset: number;
  searchName?: string;
}) =>
  total > 0 ? (
    <>
      Showing results <b>{offset + 1}</b> to <b>{offset + dataLength}</b> of{" "}
      <b>{total}</b>{" "}
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
  );

const TotalCountAsync = async <T,>({
  page,
  asyncData,
  searchName,
}: {
  asyncData: Props<T>["asyncData"];
  page: number;
  searchName?: string;
}) => {
  const { total, data } = await asyncData;

  return (
    <TotalCount
      total={total}
      dataLength={data.length}
      offset={page * 12}
      searchName={searchName}
    />
  );
};

const AsyncPaginator = async ({ asyncData }: Pick<Props<any>, "asyncData">) => {
  const { total, data } = await asyncData;
  return (
    total > 0 && (
      <Paginator dataLength={data.length} className={`mb-4`} total={total} />
    )
  );
};

const AsyncContent = async <T,>({
  asyncData,
  renderRow,
}: Pick<Props<T>, "renderRow" | "asyncData">) => {
  const { data } = await asyncData;
  return data.map(renderRow);
};

export default function SearchLayout<T>({
  suspenseKey,
  searchName,
  prevTotal,
  prevDataLength,
  asyncData,
  page,
  filters,
  renderRow,
  colNumber = 3,
  loadingPlaceholder,
}: Props<T>) {
  return (
    <>
      <div
        className={`flex gap-2 items-center flex-row py-4 max-w-screen-2xl mx-auto`}
      >
        <ArtistSearch className="flex-1" />
      </div>
      <div
        className={`
          max-w-screen-2xl h-8 leading-8 px-1 mx-auto border-b-black-transparent
          border-b
        `}
      >
        <Suspense
          key={suspenseKey}
          fallback={
            prevTotal !== undefined && prevDataLength !== undefined ? (
              <TotalCount
                total={prevTotal}
                dataLength={prevDataLength}
                searchName={searchName}
                offset={page * 12}
              />
            ) : (
              "Loading..."
            )
          }
        >
          <TotalCountAsync
            asyncData={asyncData}
            searchName={searchName}
            page={page}
          />
        </Suspense>
      </div>
      <div className={`max-w-screen-2xl mx-auto`}>{filters}</div>
      <div
        className={`grid ${
          colNumber === 4
            ? `sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6`
            : `sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`
        } gap-2 md:gap-4 lg:gap-8 max-w-screen-2xl mx-auto`}
      >
        <Suspense
          key={suspenseKey}
          fallback={Array.from({ length: 12 }).map((_, i) => (
            <Fragment key={i}>{loadingPlaceholder}</Fragment>
          ))}
        >
          <AsyncContent asyncData={asyncData} renderRow={renderRow} />
        </Suspense>
      </div>
      <Suspense
        key={suspenseKey}
        fallback={
          prevTotal !== undefined ? (
            prevTotal > 0 && (
              <Paginator
                dataLength={prevDataLength}
                className={`mb-4`}
                total={prevTotal}
              />
            )
          ) : (
            <div
              className={`
                mb-4 flex items-center justify-center select-none
                border-t-black-transparent border-t max-w-screen-2xl mx-auto mt-3 pt-2
              `}
            >
              <h1 className={`w-52 text-center`}>Loading...</h1>
            </div>
          )
        }
      >
        <AsyncPaginator asyncData={asyncData} />
      </Suspense>
    </>
  );
}
