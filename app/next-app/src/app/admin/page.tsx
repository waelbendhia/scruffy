import { updaterBaseURL } from "@/api";
import BlockContainer from "@/components/BlockContainer";
import { UpdateInfo as UpdateInfoAPI } from "@scruffy/updater";
import { revalidateTag } from "next/cache";
import { Suspense } from "react";

type DateString<T> = T extends Date ? string : T;

type UpdateInfo = {
  [K in keyof UpdateInfoAPI]: DateString<UpdateInfoAPI[K]>;
};

type StatsProps = { loading: true } | ({ loading: false } & UpdateInfo);

const DataPoint = ({
  label,
  value,
}: {
  label: string;
  value?: React.ReactNode;
}) => (
  <div className="contents text-xl">
    <span className="text-right text-dark-gray">{label}</span>
    <span>{value ?? "N/A"}</span>
  </div>
);

const formatDate = (d?: string | undefined) =>
  d ? new Date(d).toLocaleString("en-US") : undefined;

const action = async (formData: FormData) => {
  "use server";
  switch (formData.get("action")) {
    case "clear":
      await fetch(`${updaterBaseURL}/all-data`, {
        method: "DELETE",
        next: { revalidate: 0 },
      });
      revalidateTag("artists");
      revalidateTag("albums");
      return;
    case "stop":
      await fetch(`${updaterBaseURL}/update/stop`, {
        method: "PUT",
        next: { revalidate: 0 },
      });
      revalidateTag("updateInfo");
      return;
    case "start":
      await fetch(`${updaterBaseURL}/update/start`, {
        method: "PUT",
        next: { revalidate: 0 },
      });
      revalidateTag("updateInfo");
      return;
  }
};

const UpdateData = async (props: StatsProps) => {
  const Val = ({ w = "w-10" }) => (
    <div className={`bg-dark-gray rounded-md animate-pulse h-5 my-1 ${w}`} />
  );

  const Actions = () => (
    <form action={action} className="flex col-span-2 justify-center gap-2 mt-4">
      <button className="bg-dark-red" name="action" value="clear">
        Clear Data
      </button>
      <button
        name="action"
        value="stop"
        disabled={props.loading || !props.isUpdating}
      >
        Stop Update
      </button>
      <button
        name="action"
        value="start"
        disabled={props.loading || props.isUpdating}
      >
        Recheck
      </button>
    </form>
  );

  return props.loading ? (
    <>
      <h1
        className={`
            col-span-2 h-5 my-0.5 bg-dark-gray rounded-md w-40 animate-pulse
            mb-4
          `}
      />
      <DataPoint label="Started" value={<Val w="w-56" />} />
      <DataPoint label="Ended" value={<Val w="w-56" />} />
      <DataPoint label="Artists inserted" value={<Val />} />
      <DataPoint label="Albums inserted" value={<Val />} />
      <DataPoint label="Pages Read" value={<Val />} />
      <Actions />
    </>
  ) : (
    <>
      <h1 className="col-span-2 mb-4">
        {props.isUpdating ? "Currently Updating" : "Update Complete"}
      </h1>
      <DataPoint label="Started" value={formatDate(props.updateStart)} />
      <DataPoint
        label="Ended"
        value={props.isUpdating ? "N/A" : formatDate(props.updateEnd) ?? "N/A"}
      />
      <DataPoint label="Artists inserted" value={props.artists} />
      <DataPoint label="Albums inserted" value={props.albums} />
      <DataPoint label="Pages Read" value={props.pages} />
      <Actions />
    </>
  );
};

const UpdateDataAsync = async () => {
  const resp = await fetch(`${updaterBaseURL}/update/status`, {
    next: { revalidate: 0, tags: ["updateInfo"] },
  });
  const info: UpdateInfo = await resp.json();

  return <UpdateData loading={false} {...info} />;
};

const UpdateStats = () => (
  <BlockContainer className="grid grid-cols-[max-content_1fr] gap-x-2 p-8">
    <Suspense fallback={<UpdateData loading />}>
      <UpdateDataAsync />
    </Suspense>
  </BlockContainer>
);

export default async function Administration() {
  return (
    <main className="flex justify-center items-center">
      <UpdateStats />
    </main>
  );
}
