import Link from "next/link";

const githubSHA = process.env.GITHUB_SHA;
const version = githubSHA ?? process.env.NODE_ENV;
const repositoryURL = `${
  process.env.REPOSITORY_URL ?? "https://github.com/waelbendhia/scruffy"
}`;
const commitURL = !!githubSHA
  ? `${repositoryURL}/commits/${githubSHA}`
  : repositoryURL;

const emojis = ["😭", "😡", "🥴", "💔", "🤕", "🍆", "💦"];

const FooterLink = (
  props: Omit<React.ComponentProps<typeof Link>, "className">,
) => <Link className="font-bold text-white" {...props} />;

const Footer = () => {
  const emoji = emojis[Math.floor(Math.random() * emojis.length)];

  return (
    <footer className="bg-black text-dark-white px-3 py-8 text-sm">
      <div className="mx-auto max-w-screen-xl flex flex-row items-end justify-between">
        <div>
          <div className="font-display text-lg font-bold mb-4">Scruffy2.0</div>
          <div className="mb-2">
            Made with {emoji} by{" "}
            <FooterLink href="https://wbd.tn">
              Wael Ben Dhia
            </FooterLink>
          </div>
          <div>
            Version: <FooterLink href={commitURL}>{version}</FooterLink>
          </div>
        </div>
        <div className="text-sm text-right">
          <div className="mb-2">
            All artist biographies and album ratings are the property of{" "}
            <FooterLink href="https://www.scaruffi.com">Piero Scaruffi</FooterLink>
          </div>
          <div className="mb-2">
            Some release dates, artist images and album covers are from{" "}
            <FooterLink href="https://www.deezer.com">Deezer</FooterLink>
          </div>
          <div>
            Some artist images and album covers are from{" "}
            <FooterLink href="https://last.fm">last.fm</FooterLink>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
