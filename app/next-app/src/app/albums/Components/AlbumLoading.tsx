type Props = {
  year: number | undefined;
  rating: number;
  artist: { name: string };
  name: string;
};

const AlbumLoading = ({ artist, name, rating, year }: Props) => (
  <div
    className={`
      animate-pulse grid items-center relative w-full group grid-cols-labeled
      pointer-events-auto text-black h-48
    `}
  >
    <div className={`relative h-full overflow-hidden flex bg-dark-gray`} />
    <div
      className={`
        flex justify-start items-center  h-full whitespace-nowrap
        text-ellipsis overflow-hidden text-xl bottom-0 flex-row
      `}
    >
      <div className={`h-4/5 w-px min-w-px ml-3 mr-4 bg-black`} />
      <div className={"overflow-hidden max-width-full"}>
        <div
          className={`
              overflow-hidden whitespace-nowrap text-ellipsis max-w-full
              text-lg font-bold
            `}
        >
          {artist.name}
        </div>
        <div className={`overflow-hidden whitespace-normal text-base`}>
          {name}
        </div>
        <div className={`overflow-hidden text-ellipsis text-sm`}>
          <b>{rating}</b> / 10
        </div>
        <div
          className={`
            overflow-hidden text-ellipsis text-sm text-gray font-bold
          `}
        >
          {year ?? "N/A"}
        </div>
      </div>
    </div>
  </div>
);
export default AlbumLoading;
