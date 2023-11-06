import * as React from 'react';
import { StyleSheet, css } from 'aphrodite/no-important';
import { definitions } from '.';
// @ts-ignore
import loadingImage from './ScruffFace.png';

const styles = StyleSheet.create({
  container: {
    height: `calc(100vh -  ${definitions.headerHeight})`,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: definitions.colors.black,
    fontSize: '60px',
    zIndex: 1,
  },
  spinner: {
    width: '100px',
    height: '100px',
    animationName: [
      {
        from: { transform: 'rotate(0deg)' },
        to: { transform: 'rotate(360deg)' },
      },
    ],
    animationDuration: '2s',
    animationIterationCount: 'infinite',
    animationTimingFunction: 'linear',
    filter:
      'drop-shadow(0 2px 1px black)' +
      'drop-shadow(0 -2px 1px black)' +
      'drop-shadow(2px 0 1px black)' +
      'drop-shadow(-2px 0 1px black)',
  },
});

const View = ({ className }: { className?: string }) => (
  <div className={css(styles.container) + ' ' + className}>
    <img src={loadingImage} className={css(styles.spinner)} />
    <div>Loading...</div>
  </div>
);

export default View;
