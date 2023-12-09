import Image from "next/image";

const FullPageSpinner = () => (
  <main className="flex justify-center items-center">
    <div
      className="flex flex-col items-center justify-center drop-shadow-sm z-10"
    >
      <Image
        src="/ScruffFace.png"
        alt="Scaruffi"
        width={96}
        height={96}
        className="animate-spin-slow drop-shadow"
      />
      <div>Loading...</div>
    </div>
  </main>
);

export default FullPageSpinner;
