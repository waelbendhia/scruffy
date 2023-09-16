import * as React from 'react';
import { Band, Loading, definitions, Loadable, caseOf } from '../shared';
import { TransitionGroup, CSSTransition } from 'react-transition-group';
import { css, StyleSheet } from 'aphrodite/no-important';
import BandView from './BandView';
import { IState } from '../store';
import { connect } from 'react-redux';
import DocumentTitle from 'react-document-title';

const styles = StyleSheet.create({
  container: {
    minHeight: `calc(100vh - ${definitions.headerHeight})`,
    paddingBottom: '48px',
  },
  loading: {
    height: '100%',
    width: '100%',
  },
  out: {
    opacity: 0,
    transitionDuration: definitions.transitions.fast,
    transitionProperty: 'transform opacity',
  },
  in: {
    opacity: 1,
    transitionDuration: definitions.transitions.fast,
    transitionProperty: 'transform opacity',
  },
  position: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});

const mapStateToProps = (state: IState) => state.band;

const View = (band: Loadable<Band>) => (
  <DocumentTitle title={`Scaruffi2.0: ${band.data?.name ?? ''}`}>
    <TransitionGroup className={css(styles.container)}>
      <CSSTransition
        key={caseOf(band, {
          error: () => 'error',
          loading: () => 'loading',
          ok: () => 'bands',
          notRequested: () => 'not requested',
        })}
        timeout={150}
        classNames={{
          appear: css(styles.in),
          appearActive: css(styles.out),
          enter: css(styles.out),
          enterActive: css(styles.in),
          exit: css(styles.out),
          exitActive: css(styles.in),
        }}
      >
        {caseOf(band,{
          ok: (b: Band) => <BandView {...b} />,
          error: (e: unknown) => <div>{JSON.stringify(e)}</div>,
          loading: () => (
            <Loading className={css(styles.loading, styles.position)} />
          ),
          notRequested: () => <div>Not Requested</div>,
        })}
      </CSSTransition>
    </TransitionGroup>
  </DocumentTitle>
);

export default connect(mapStateToProps)(View);
