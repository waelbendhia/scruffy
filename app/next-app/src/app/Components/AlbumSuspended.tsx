import { Suspense } from "react";
import AlbumWithBlur from "./AlbumWithBlur";
import AlbumCard from "@/components/AlbumCard";

const AlbumSuspended = (props: React.ComponentProps<typeof AlbumWithBlur>) => (
  <Suspense fallback={<AlbumCard loading {...props} />}>
    <AlbumWithBlur {...props} />
  </Suspense>
);

export default AlbumSuspended;
