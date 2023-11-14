const Bio = ({ className, bio }: { className?: string; bio: string }) => {
  const [firstParagraph, ...rest] = bio
    .split("\n\n")
    .filter((t) => t.trim() !== "");
  return (
    <div className={`${className ?? ""} px-8 pb-12`}>
      {firstParagraph && (
        <p
          className={
            `font-normal text-base mt-16 first-letter:font-display ` +
            `first-letter:text-3xl first-letter:ml-4`
          }
        >
          {firstParagraph}
        </p>
      )}
      {rest.map((text, i) => (
        <p key={i} className={`font-normal text-base mt-2`}>
          {text}
        </p>
      ))}
      <div className={`mt-24 ml-8 h-1 bg-red`} />
    </div>
  );
};

export default Bio;
