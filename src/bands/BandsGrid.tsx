import * as React from 'react';
import { SmallCard, Grid } from '../shared';
import { StyleSheet, css } from 'aphrodite';
import { IState } from '../store';
import { Dispatch } from 'redux';
import { Action, makeGetBandsAction } from './types';
import { bound, Band } from '../shared/types/Other';
import { connect } from 'react-redux';
// @ts-ignore
import defaultImage from './bandDefault.svg';

const styles = StyleSheet.create({
  grid: { gridArea: 'grid', position: 'relative' },
});

const mapStateToProps = ({ bands }: IState) => ({
  bands: bands.bands,
  maxPage: Math.ceil(bands.count / bands.request.itemsPerPage),
  page: bands.request.page,
});

type StateProps = ReturnType<typeof mapStateToProps>;

const mapDispatchToProps = (dispath: Dispatch<Action>) => ({
  changePage: (maxPage: number, page: number) => (delta: number) =>
    dispath(
      makeGetBandsAction({
        page: bound(0, maxPage - 1, page + delta),
      })
    ),
});

type MergedProps = StateProps & {
  changePage: (delta: number) => void;
};

const View = (props: MergedProps) => (
  <Grid
    className={css(styles.grid)}
    {...props}
    data={props.bands}
    minRows={2}
    cell={(b: Band) => (
      <SmallCard key={b.url} bgUrl={b.imageUrl || defaultImage} {...b}>
        {b.name}
      </SmallCard>
    )}
  />
);

export default connect(
  mapStateToProps,
  mapDispatchToProps,
  (stateProps, dispatchProps) => ({
    ...stateProps,
    changePage: dispatchProps.changePage(stateProps.maxPage, stateProps.page),
  })
)(View);
