import * as React from 'react';
import { SmallCard, Grid } from '../shared';
import { StyleSheet, css } from 'aphrodite/no-important';
import { IState } from '../store';
import { Dispatch } from 'redux';
import { Action, makeGetAlbumsAction } from './types';
import { bound } from '../shared/types/Other';
import { connect } from 'react-redux';
// @ts-ignore
import defaultImage from './albumDefault.svg';

const styles = StyleSheet.create({
  band: { fontSize: '0.8em', overflow: 'hidden', textOverflow: 'ellipsis' },
  album: { fontSize: '0.9em', overflow: 'hidden', textOverflow: 'ellipsis' },
  date: { fontSize: '0.8em' },
  grid: { gridArea: 'grid', position: 'relative' },
});

const mapStateToProps = ({ albums }: IState) => ({
  albums: albums.albums,
  maxPage: Math.ceil(albums.count / albums.request.itemsPerPage),
  page: albums.request.page,
});

type StateProps = ReturnType<typeof mapStateToProps>;

const mapDispatchToProps = (dispatch: Dispatch<Action>) => ({
  changePage: (maxPage: number, page: number) => (delta: number) =>
    dispatch(
      makeGetAlbumsAction({
        page: bound(0, maxPage - 1, page + delta),
      })
    ),
});

type MergedProps = StateProps & { changePage: (delta: number) => void };

const View = (props: MergedProps) => (
  <Grid
    className={css(styles.grid)}
    {...props}
    data={props.albums}
    cell={(a) => (
      <SmallCard
        key={(a.band ? a.band.url : '') + a.name}
        bgUrl={a.imageUrl || defaultImage}
        url={a.band ? a.band.url : ''}
      >
        <div className={css(styles.band)}>{!!a.band ? a.band.name : ''}</div>
        <div className={css(styles.album)}>
          <b>{a.name}</b>
          <span className={css(styles.date)}>
            &nbsp;({a.year !== 0 ? a.year : 'NA'})
          </span>
        </div>
        <div>{a.rating}/10</div>
      </SmallCard>
    )}
    minRows={2}
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
