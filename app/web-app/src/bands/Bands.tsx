import * as React from 'react';
import { StyleSheet, css } from 'aphrodite/no-important';
import { definitions, Paginator } from '../shared';
import Filters from './Filters';
import BandsGrid from './BandsGrid';
import DocumentTitle from 'react-document-title';
import { IState } from '../store';
import { Dispatch } from 'redux';
import { Action, makeGetBandsAction } from './types';
import { bound } from '../shared/types/Other';
import { Omit } from 'react-router';
import { connect } from 'react-redux';

const styles = StyleSheet.create({
  layoutGrid: {
    height: `calc(100vh - ${definitions.headerHeight})`,
    display: 'grid',
    gridTemplateColumns: 'minmax(20%, 200px) 1fr',
    gridTemplateRows: '1fr 60px',
    gridTemplateAreas: `
        "filter grid"
        "filter paginator"
      `,
    '@media (max-width: 860px)': {
      position: 'relative',
      overflow: 'hidden',
      gridTemplateAreas: `
          "grid"
          "paginator"
        `,
      gridTemplateColumns: '100%',
    },
  },
});

const mapStateToProps = ({ bands: { count, request } }: IState) => {
  const maxPage = Math.ceil(count / request.itemsPerPage);

  return {
    page: Math.min(request.page, maxPage - 1),
    maxPage: maxPage,
  };
};

type StateProps = ReturnType<typeof mapStateToProps>;

const mapDispatchToProps = (dispath: Dispatch<Action>) => ({
  changePage: (maxPage: number, page: number) => (delta: number) =>
    dispath(
      makeGetBandsAction({
        page: bound(0, maxPage - 1, page + delta),
      }),
    ),
});

type DispatchProps = ReturnType<typeof mapDispatchToProps>;

type MergedProps = StateProps &
  Omit<DispatchProps, 'changePage'> & {
    changePage: (delta: number) => void;
  };

const View = (props: MergedProps) => (
  <DocumentTitle title="Scaruffi2.0: Bands">
    <div className={css(styles.layoutGrid)}>
      <Filters />
      <BandsGrid />
      <Paginator {...props} />
    </div>
  </DocumentTitle>
);

export default connect(
  mapStateToProps,
  mapDispatchToProps,
  (stateProps, dispatchProps) => ({
    ...stateProps,
    changePage: dispatchProps.changePage(stateProps.maxPage, stateProps.page),
  }),
)(View);
