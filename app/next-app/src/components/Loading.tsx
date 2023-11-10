import * as React from "react";
import Image from "next/image";

const Loading = ({
  className,
  children,
  loading = false,
}: React.PropsWithChildren<{ className?: string; loading?: boolean }>) => (
  <div className={`relative ${className ?? ""}`}>
    {children}
    <div
      className={
        `absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center ` +
        `text-black text-3xl z-10 ${
          loading ? "opacity-100 visible" : "opacity-0 invisible"
        } transition-opacity`
      }
    >
      <div
        className={`absolute top-0 left-0 w-full h-full backdrop-blur-sm z-0`}
      />
      <div
        className={`flex flex-col items-center justify-center drop-shadow-sm z-10`}
      >
        <Image
          src="/ScruffFace.png"
          alt="Scaruffi"
          width={96}
          height={96}
          className={`animate-spin-slow drop-shadow`}
        />
        <div>Loading...</div>
      </div>
    </div>
  </div>
);

export default Loading;
