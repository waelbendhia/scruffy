export interface Band {
  url: string,
  fullUrl?: string,
  name: string,
  bio?: string,
  imageUrl?: string,
  relatedBands?: Band[],
  albums?: Album[]
}
export interface Album {
  name: string,
  year: number,
  rating: number,
  imageUrl: string,
  band?: Band
}