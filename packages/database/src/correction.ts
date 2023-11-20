import { prisma, Prisma, PrismaClient } from "./client";

type ArtistCorrection = {
  url: string;
  correction:
    | { type: "name"; proposedName: string }
    | { type: "image"; selectedImageURL: string }
    | { type: "biography"; proposedChange: string };
};

type AlbumCorrection = {
  artistURL: string;
  name: string;
  correction:
    | { type: "cover"; selectedImageURL: string }
    | { type: "release date"; proposedReleaseYear: number }
    | { type: "rating"; proposedRating: number };
};

type Correction = {
  submittedOn: Date;
  status: "pending" | "rejected" | "accepted";
} & (
  | ({ type: "album" } & AlbumCorrection)
  | ({ type: "artist" } & ArtistCorrection)
);

export const submitCorrection = (correction: Correction) => {
  let createData: Prisma.CorrectionCreateInput;
  switch (correction.type) {
    case "artist":
      createData = { artist: { connect: { url: correction.url } } };
      switch (correction.correction.type) {
        case "name":
          createData = {
            ...createData,
            proposedName: correction.correction.proposedName,
          };
          break;
        case "biography":
          createData = {
            ...createData,
            proposedBiographyChange: correction.correction.proposedChange,
          };
          break;
        case "image":
          createData = {
            ...createData,
            selectedImageURL: correction.correction.selectedImageURL,
          };
          break;
      }
      break;
    case "album":
      createData = {
        album: {
          connect: {
            artistUrl_name: {
              artistUrl: correction.artistURL,
              name: correction.name,
            },
          },
        },
      };
      switch (correction.correction.type) {
        case "cover":
          createData = {
            ...createData,
            proposedCoverURL: correction.correction.selectedImageURL,
          };
          break;
        case "rating":
          createData = {
            ...createData,
            proposedRating: correction.correction.proposedRating,
          };
          break;
        case "release date":
          createData = {
            ...createData,
            proposedReleaseYear: correction.correction.proposedReleaseYear,
          };
          break;
      }
      break;
  }

  return prisma.correction.create({ data: createData });
};

type DBCorrection = Exclude<
  Awaited<ReturnType<typeof prisma.correction.findUnique>>,
  null
>;

const asCorrection = (v: DBCorrection): Correction => {
  const base = {
    submittedOn: v.submittedOn,
    status:
      v.status === "rejected"
        ? ("rejected" as const)
        : v.status === "accepted"
        ? ("accepted" as const)
        : ("pending" as const),
  };

  if (v.artistUrl) {
    const artistBase = { ...base, type: "artist" as const, url: v.artistUrl };
    if (v.proposedName) {
      return {
        ...artistBase,
        correction: { type: "name", proposedName: v.proposedName },
      };
    } else if (v.selectedImageURL) {
      return {
        ...artistBase,
        correction: { type: "image", selectedImageURL: v.selectedImageURL },
      };
    } else if (v.proposedBiographyChange) {
      return {
        ...artistBase,
        correction: {
          type: "biography",
          proposedChange: v.proposedBiographyChange,
        },
      };
    }

    throw "error"; // TODO: use proper exceptions
  } else if (v.albumArtistURL && v.albumName) {
    const albumBase = {
      ...base,
      type: "album" as const,
      artistURL: v.albumArtistURL,
      name: v.albumName,
    };
    if (v.proposedCoverURL) {
      return {
        ...albumBase,
        correction: { type: "cover", selectedImageURL: v.proposedCoverURL },
      };
    } else if (v.proposedReleaseYear) {
      return {
        ...albumBase,
        correction: {
          type: "release date",
          proposedReleaseYear: v.proposedReleaseYear,
        },
      };
    } else if (v.proposedRating) {
      return {
        ...albumBase,
        correction: {
          type: "rating",
          proposedRating: v.proposedRating.toNumber(),
        },
      };
    }

    throw "error"; // TODO: use proper exceptions
  }

  throw "error"; // TODO: use proper exceptions
};

type TX = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

const withCorrection = async <T>(
  id: number,
  f: (_: Correction, tx: TX) => T,
): Promise<T | null> =>
  prisma.$transaction(async (tx) => {
    const correction = await tx.correction.findUnique({ where: { id } });
    if (!correction) return null;
    return await f(asCorrection(correction), tx);
  });
