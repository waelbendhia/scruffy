import { updaterBaseURL } from "@/api";
import BlockContainer from "@/components/BlockContainer";
import { revalidateTag } from "next/cache";
import { Suspense } from "react";
import React from "react";
import { UpdateData, UpdateDataWithSSE } from "./UpdateStatusClient";
import AdminButton from "./Submit";
import { UpdateStatus } from "@scruffy/updater";

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

type StatusProps = { loading: true } | ({ loading: false } & UpdateStatus);

const Actions = async (props: StatusProps) => {
  "use server";
  return (
    <form action={action} className="flex col-span-2 justify-center gap-2 mt-4">
      <AdminButton className="bg-dark-red" name="action" value="clear">
        Clear Data
      </AdminButton>
      <AdminButton
        name="action"
        value="stop"
        disabled={props.loading || !props.isUpdating}
      >
        Stop Update
      </AdminButton>
      <AdminButton
        name="action"
        value="start"
        disabled={props.loading || props.isUpdating}
      >
        Recheck
      </AdminButton>
    </form>
  );
};

const UpdateContent = async (props: StatusProps) => {
  return (
    <>
      {props.loading ? (
        <UpdateData loading />
      ) : (
        <UpdateDataWithSSE {...props} />
      )}
      <Actions {...props} />
    </>
  );
};

const UpdateDataAsync = async () => {
  const resp = await fetch(`${updaterBaseURL}/update/status`, {
    next: { revalidate: 0, tags: ["updateInfo"] },
  });
  const info: UpdateStatus = await resp.json();

  return <UpdateContent loading={false} {...info} />;
};

const UpdateStatus = () => (
  <BlockContainer className="grid grid-cols-[max-content_1fr] gap-x-2 p-8 pt-4">
    <h1 className="col-span-2 mb-4">Update Status</h1>
    <Suspense fallback={<UpdateContent loading />}>
      <UpdateDataAsync />
    </Suspense>
  </BlockContainer>
);

export default UpdateStatus;
