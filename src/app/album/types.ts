export {
  Album,
  parseFromRow,
};

import { Band } from '../band';

interface Album {
  name: string;
  year: number;
  rating: number;
  imageUrl: string;
  band?: Band;
}

const parseFromRow = (row: any): Album =>
  ({
    name: row.name,
    year: row.year,
    rating: row.rating,
    imageUrl: row.imageUrl
  });
