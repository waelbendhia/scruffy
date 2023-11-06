import { StyleSheet } from 'aphrodite/no-important';
import { definitions } from '../shared';

const styles = StyleSheet.create({
  root: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    margin: 0,
    height: '300px',
    lineHeight: '300px',
    textAlign: 'center',
    fontSize: '10vw',
    userSelect: 'none',
  },
  text: {
    display: 'flex',
    justifyContent: 'center',
    flexDirection: 'column',
    minHeight: `calc(100vh - ${definitions.headerHeight} - 300px)`,
    fontSize: '3vw',
    fontWeight: 'lighter',
    textAlign: 'center',
    padding: '0px 128px',
    '@media (max-width: 800px)': {
      padding: 0,
      fontSize: '4vw',
    },
  },
  counts: {
    display: 'grid',
    gridGap: '16px',
    gridTemplateColumns: 'repeat(2, 1fr)',
    fontSize: '2em',
    margin: '20px 0',
  },
  label: {
    color: definitions.colors.blackTransparent,
  },
  histogram: {
    flex: 1,
    margin: '32px',
    padding: '16px',
    height: '400px',
    display: 'grid',
    fontSize: '24px',
    maxWidth: '1000px',
    gridTemplateColumns: 'repeat(20, 5%)',
    gridTemplateRows: '1fr 32px',
  },
  cell: {
    textAlign: 'center',
  },
  flexRow: {
    alignSelf: 'stretch',
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
  },
});

export default styles;