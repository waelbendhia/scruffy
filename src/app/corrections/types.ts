import { IBand } from '../band';

interface ICorrection {
  id: number;
  text: string;
  submittedOn: Date;
  band: IBand;
}

const parseCorrectionFromRow =
  ({ id, text, submitted_on, band }: any): ICorrection =>
    ({
      id,
      text,
      submittedOn: new Date(submitted_on),
      band: {
        name: '',
        url: band,
      },
    });

interface IRevision {
  id: number;
  text: string;
  submittedOn: Date;
  correction: ICorrection;
}

const parseRevisionFromRow =
  ({ id, text, submitted_on, correction }: any): IRevision => ({
    id,
    text,
    submittedOn: new Date(submitted_on),
    correction: {
      id: correction,
      text: '',
      submittedOn: new Date(),
      band: { url: '', name: '' },
    },
  });

export {
  ICorrection,
  IRevision,
  parseCorrectionFromRow,
  parseRevisionFromRow,
};
