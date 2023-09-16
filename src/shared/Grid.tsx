import * as React from 'react';
import { TransitionGroup, CSSTransition } from 'react-transition-group';
import Loading from './Loading';
import { definitions } from './style';
import { StyleSheet, css } from 'aphrodite/no-important';
import { Loadable, caseOf } from './types';

interface IGridProps<T> {
  data: Loadable<T[]>;
  changePage: (_: number) => void;
  className?: string;
  cell: (x: T) => React.ReactNode;
  minRows: number;
}

function Grid<T>(props: IGridProps<T>) {
  const { data, changePage, className, cell, minRows } = props;
  const styles = StyleSheet.create({
    grid: {
      gridArea: 'grid',
      padding: '16px',
      gridGap: '1vw',
      display: 'grid',
      gridTemplateColumns: 'repeat(5, minmax(1px, 1fr))',
      gridAutoRows: `minmax(1px, ${100 / minRows}%)`,
      ':focus': { outline: 'none' },
      '@media (max-width: 860px)': {
        gridTemplateColumns: 'repeat(3, minmax(1px, 1fr))',
      },
    },
    loading: { gridArea: 'grid' },
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
  });

  return (
    <TransitionGroup
      onKeyUpCapture={(e: KeyboardEvent) => {
        if (e.key === 'ArrowRight') {
          changePage(1);
        } else if (e.key === 'ArrowLeft') {
          changePage(-1);
        }
      }}
      tabIndex={0}
      className={className}
      component={null}
    >
      {
        <CSSTransition
          key={caseOf(data, {
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
          {caseOf(data, {
            ok: (xs) => <div className={css(styles.grid)}>{xs.map(cell)}</div>,
            error: () => <h1>Damn...</h1>,
            notRequested: () => <h1>Nothing</h1>,
            loading: () => <Loading className={css(styles.loading)} />,
          })}
        </CSSTransition>
      }
    </TransitionGroup>
  );
}

export default Grid;
