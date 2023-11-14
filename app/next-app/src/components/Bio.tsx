const Bio = ({ className, bio }: { className?: string; bio: string }) => (
  <div className={`${className ?? ""} px-8 pb-12`}>
    {bio
      .split("\n\n")
      .filter((t) => t.trim() !== "")
      .map((text, i) => (
        <p
          key={i}
          className={
            `font-normal text-base mt-16 first-letter:font-display ` +
            `first-letter:text-3xl first-letter:ml-4 leading-6`
          }
        >
          {text}
        </p>
      ))}
    <div className={`mt-24 ml-8 h-1 bg-red`} />
  </div>
);

export default Bio;
