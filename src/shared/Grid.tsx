import * as React from 'react';
import { TransitionGroup, CSSTransition } from 'react-transition-group';
import { Loadable, mapLoadable } from './types';
import Loading from './Loading';
import { definitions } from './style';
import { StyleSheet, css } from 'aphrodite/no-important';

interface IGridProps<T> {
  data: Loadable<T[]>;
  changePage: (_: number) => void;
  className?: string;
  cell: (x: T) => React.ReactNode;
  displayError: (e: Error) => React.ReactNode;
  minRows: number;
}

function Grid<T>({
  data,
  changePage,
  className,
  cell,
  displayError,
  minRows,
}: IGridProps<T>) {
  const styles = StyleSheet.create({
    grid: {
      height: 'calc(100% - 32px)',
      width: 'calc(100% - 32px)',
      padding: '16px',
      gridGap: '1vw',
      display: 'grid',
      gridTemplateColumns: 'repeat(5, minmax(1px, 1fr))',
      gridAutoRows: `minmax(1px, ${100 / minRows}%)`,
      ':focus': { outline: 'none' }
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

  return (
    <TransitionGroup
      onKeyUpCapture={e => {
        switch (e.key) {
          case 'ArrowRight':
            changePage(1);
            return;
          case 'ArrowLeft':
            changePage(-1);
            return;
          default:
            return;
        }
      }}
      tabIndex={0}
      className={className}
    >
      {
        <CSSTransition
          key={mapLoadable(data, 'error', 'loading', 'bands')}
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
          {mapLoadable(
            data,
            xs => (
              <div className={css(styles.grid, styles.position)}>
                {xs.map(cell)}
              </div>
            ),
            displayError,
            <Loading className={css(styles.loading, styles.position)} />,
          )}
        </CSSTransition>
      }
    </TransitionGroup>
  );
}

export default Grid;