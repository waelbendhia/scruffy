import { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Search Director Biographies",
  description: "Director biographies by Piero Scaruffi",
};

const Directors = () => (
  <main className="flex flex-1 px-4">
    <div className="flex-1 flex flex-col justify-center">
      <div className="flex justify-center items-center">
        <Image
          width={100}
          height={113}
          src="/under-construction-2.gif"
          alt="under-construction"
        />
        <Image
          width={350}
          height={20}
          src="/under-construction-1.gif"
          alt="under-construction"
        />
        <Image
          width={101}
          height={94}
          src="/under-construction-3.gif"
          alt="under-construction"
        />
      </div>
    </div>
  </main>
);

export default Directors;
