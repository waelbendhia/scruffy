import { isLoggedIn, login } from "@/app/actions";
import Input from "@/components/Input";
import { RedirectType, redirect } from "next/navigation";

type Props = {
  searchParams: Record<string, string>;
};

const checkLogin = async () => {
  if (await isLoggedIn()) {
    return redirect("/admin", RedirectType.replace);
  }
};

const submitLogin = async (formData: FormData) => {
  "use server";
  if (await isLoggedIn()) {
    return redirect("/admin", RedirectType.replace);
  }

  const password = formData.get("password");
  if (password === null || typeof password !== "string")
    return redirect("/login?failed=true", RedirectType.replace);

  const sessionToken = await login(password);
  if (!sessionToken)
    return redirect("/login?failed=true", RedirectType.replace);

  return redirect("/admin", RedirectType.replace);
};

export default async function Login({ searchParams }: Props) {
  await checkLogin();

  const failed = searchParams.failed;

  return (
    <main className="flex justify-center items-center">
      <div
        className="
          bg-white-transparent backdroup-blur-sm rounded-sm max-w-screen-lg
          mx-auto p-8 drop-shadow-md
        "
      >
        <h2 className="text-xl">Prove it</h2>
        <form className="mt-8" action={submitLogin}>
          <Input name="password" type="password" />
          <button className="mt-4" type="submit">
            Login
          </button>
        </form>
        {failed && (
          <div className="text-red text-lg mt-8">Wrong password bucko!</div>
        )}
      </div>
    </main>
  );
}
