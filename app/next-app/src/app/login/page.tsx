import { login } from "@/app/actions";
import Input from "@/components/Input";
import { headers } from "next/headers";
import { RedirectType, redirect } from "next/navigation";

type Props = {
  searchParams: Record<string, string>;
};

export default function Login({ searchParams }: Props) {
  const failed = searchParams.failed;

  async function submitLogin(formData: FormData) {
    "use server";
    const headerList = headers();
    console.log("headers", {
      "x-forwarded-host": headerList.get("x-forwarded-host"),
      host: headerList.get("host"),
      origin: headerList.get("origin"),
    });

    const password = formData.get("password");
    if (password === null || typeof password !== "string")
      return redirect("/login?failed=true", RedirectType.replace);

    const sessionToken = await login(password);
    if (!sessionToken)
      return redirect("/login?failed=true", RedirectType.replace);

    return redirect("/administration", RedirectType.replace);
  }

  return (
    <main className="flex justify-center items-center">
      <div
        className={`
          bg-white-transparent backdroup-blur-sm rounded-sm max-w-screen-lg
          mx-auto p-8 drop-shadow-md
        `}
      >
        <h2 className="text-xl">Prove it</h2>
        <form className="mt-8" action={submitLogin}>
          <Input name="password" type="password" />
          <button
            className="hover:text-red transition-colors text-lg mt-4"
            type="submit"
          >
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
