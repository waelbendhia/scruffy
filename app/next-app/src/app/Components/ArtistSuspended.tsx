import { Suspense } from "react";
import ArtistWithBlur from "./ArtistWithBlur";
import ArtistCard from "@/components/ArtistCard";

const ArtistSuspended = (
  props: React.ComponentProps<typeof ArtistWithBlur>,
) => (
  <Suspense key={props.url} fallback={<ArtistCard loading {...props} />}>
    <ArtistWithBlur {...props} />
  </Suspense>
);

export default ArtistSuspended;
