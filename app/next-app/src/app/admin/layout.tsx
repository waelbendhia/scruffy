import { isLoggedIn } from "../actions";
import { RedirectType, redirect } from "next/navigation";

const getData = async () => {
  "use server";
  if (!await isLoggedIn()) {
    return redirect("/login", RedirectType.replace);
  }
};

export default async function AdministrationLayout({
  children,
}: React.PropsWithChildren) {
  await getData();
  return <>{children}</>;
}
