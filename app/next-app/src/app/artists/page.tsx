import { searchArtists } from "@/api";

export async function getData() {
  return await searchArtists({});
}

export default async function Artists() {
  const data = await getData();
  return (
    <main>
      artists
      {data.data.map((a) => a.name)}
    </main>
  );
}
