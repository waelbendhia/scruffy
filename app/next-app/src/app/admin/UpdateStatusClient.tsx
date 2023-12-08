"use client";
import React from "react";
import { useUpdates } from "@/hooks";
import DataPoint from "./DataPoint";
import { UpdateStatus } from "@scruffy/updater";

type StatusProps = { loading: true } | ({ loading: false } & UpdateStatus);

const formatDate = (d?: string | undefined) =>
  d ? new Date(d).toLocaleString("en-US") : undefined;

const Val = ({ w = "w-10" }) => (
  <div className={`bg-dark-gray rounded-md animate-pulse h-5 my-1 ${w}`} />
);

const formatDuration = (d: number | undefined): string => {
  if (d === undefined) {
    return "N/A";
  }

  const h = Math.floor(d / 3_600_000)
    .toString()
    .padStart(2, "0");
  const m = Math.floor((d % 3_600_000) / 60_000)
    .toString()
    .padStart(2, "0");
  const s = Math.floor((d % 60_000) / 1_000)
    .toString()
    .padStart(2, "0");

  return `${h}:${m}:${s}`;
};

export const UpdateData = (props: StatusProps) => {
  const duration =
    props.loading || !props.updateStart
      ? undefined
      : (!props.isUpdating && props.updateEnd
          ? new Date(props.updateEnd)
          : new Date()
        ).getTime() - new Date(props.updateStart).getTime();

  return props.loading ? (
    <>
      <DataPoint label="Started" value={<Val w="w-56" />} />
      <DataPoint label="Ended" value={<Val w="w-56" />} />
      <DataPoint label="Artists inserted" value={<Val />} />
      <DataPoint label="Albums inserted" value={<Val />} />
      <DataPoint label="Pages Read" value={<Val />} />
    </>
  ) : (
    <>
      <DataPoint
        label="Status"
        value={props.isUpdating ? "Currently Updating" : "Update Complete"}
      />
      <DataPoint label="Started" value={formatDate(props.updateStart)} />
      <DataPoint
        label="Ended"
        value={props.isUpdating ? "N/A" : formatDate(props.updateEnd) ?? "N/A"}
      />
      <DataPoint label="Duration" value={formatDuration(duration)} />
      <DataPoint label="Artists inserted" value={props.artists} />
      <DataPoint label="Albums inserted" value={props.albums} />
      <DataPoint label="Pages Read" value={props.pages} />
    </>
  );
};

export const UpdateDataWithSSE = (props: UpdateStatus) => {
  "use client";
  const [updateState, setState] = React.useState(props);

  const cb = React.useCallback(
    (d: UpdateStatus) => {
      setState(d);
      console.log(d);
    },
    [setState],
  );

  useUpdates(cb);

  return <UpdateData loading={false} {...updateState} />;
};
