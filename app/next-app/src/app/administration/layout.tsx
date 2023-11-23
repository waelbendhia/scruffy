import { cookies } from "next/headers";
import { isLoggedIn } from "../actions";
import { RedirectType, redirect } from "next/navigation";

const getData = async () => {
  "use server";
  const authToken = cookies().get("authentication")?.value;
  if (!isLoggedIn(authToken)) {
    return redirect("/login", RedirectType.replace);
  }
};

export default async function AdministrationLayout({
  children,
}: React.PropsWithChildren) {
  await getData();
  return <>{children}</>;
}
