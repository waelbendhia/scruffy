import * as React from "react";
import Image from "next/image";

const View = ({
  className,
  children,
  loading = false,
}: React.PropsWithChildren<{ className?: string; loading?: boolean }>) => (
  <>
    {children}
    <div
      className={
        `h-full flex flex-col items-center justify-center text-black ` +
        `text-6xl z-10 ${
          loading ? "opacity-0" : "opacity-100"
        } transition-opacity ${className}`
      }
    >
      <Image
        src={"ScruffFace.png"}
        alt="Scaruffi"
        className={`w-24 h-24 animate-spin-slow drop-shadow`}
      />
      <div>Loading...</div>
    </div>
  </>
);

export default View;
