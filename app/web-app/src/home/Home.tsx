import * as React from 'react';
import { State } from './types';
import { css } from 'aphrodite/no-important';
import styles from './styles';
import { IState } from '../store';
import { connect } from 'react-redux';

const mapStateToProps = (state: IState) => state.home;

const View = (props: State) => (
  <div className={css(styles.root)}>
    <h1 className={css(styles.title)}>Scaruffi2.0</h1>
    <div className={css(styles.text)}>
      <p>
        In which I attempt to organize the award winning
        <br />music, film, political and scientific
        <br />historian Scaruffi's knowledge base of film and music.
      </p>
    </div>
    {/* {props.caseOf({
      ok: data => [
        <h1 key="stats">Statistics</h1>,
        <div key="counts" className={css(styles.flexRow)}>
          <div className={css(styles.counts)} >
            <span className={css(styles.label)}>Bands reviewed:</span>
            <span>{data.bandCount}</span>
            <span className={css(styles.label)}>Albums reviewed:</span>
            <span>{data.albumCount}</span>
          </div>
        </div>,
        <div key="histo" className={css(styles.flexRow)}>
          <RatingHistogram {...data.ratings} />
        </div>,
      ],
      // TODO: Display error message
      err: e => e.message,
      // TODO: replace with loading indicator
      loading: 'Loading',
    })} */}
  </div>
);

export default connect(mapStateToProps)(View);