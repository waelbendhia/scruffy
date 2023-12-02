import UpdateStatus from "./UpdateStatus";
import Providers from "./Providers";

export default async function Administration() {
  return (
    <main className="flex justify-center items-center py-4">
      <div className="grid grid-cols-2 gap-4">
        <UpdateStatus />
        <Providers />
      </div>
    </main>
  );
}
