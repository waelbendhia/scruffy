"use client";
import { useFormStatus } from "react-dom";
import DataPoint from "./DataPoint";
import { AlbumProviders, ArtistProviders } from "@scruffy/updater";

type Providers<T extends "artist" | "album"> = T extends "artist"
  ? keyof ArtistProviders
  : keyof AlbumProviders;

type Props<T extends "artist" | "album"> = {
  type: T;
  labels: Record<Providers<T>, string>;
  values?: Record<Providers<T>, boolean>;
};

const Fields = <T extends "artist" | "album">({
  labels,
  values,
  type,
}: Props<T>) => {
  const { pending } = useFormStatus();

  return (
    <>
      {Object.keys(labels)
        .filter((k): k is Providers<T> => k in labels)
        .map((k) => {
          const label = labels[k];
          const value = values?.[k];

          return (
            <DataPoint
              key={`${type}-${k}`}
              className={`[&>span:first-child]:pl-4 group `}
              label={
                <label
                  className={`ml-1 transition-colors ${
                    pending ? "pointer-events-none" : ""
                  }`}
                  htmlFor="artist-spotify"
                >
                  {label}
                </label>
              }
              value={
                <input
                  className={pending ? "animate-pulse" : ""}
                  disabled={pending}
                  id={`${type}-${k}`}
                  type="checkbox"
                  name={`${type}-${k}`}
                  defaultChecked={value}
                />
              }
            />
          );
        })}
    </>
  );
};

export default Fields;
