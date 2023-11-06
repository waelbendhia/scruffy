import { definitions } from '../shared';
import { StyleSheet } from 'aphrodite/no-important';

const styles = StyleSheet.create({
  header: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'row',
    height: definitions.headerHeight,
    backgroundColor: definitions.colors.black,
    color: definitions.colors.white,
    paddingLeft: `calc(${definitions.headerHeight} / 2)`,
    paddingRight: `calc(${definitions.headerHeight} / 2)`,
    zIndex: 5,
  },
  siteTitle: {
    display: 'block',
    float: 'left',
    height: definitions.headerHeight,
    lineHeight: definitions.headerHeight,
    fontFamily: definitions.fonts.heading,
    fontWeight: 'bold',
    color: definitions.colors.white,
    fontSize: '3em',
  },
  linkStyle: {
    position: 'relative',
    height: definitions.headerHeight,
    width: '120px',
    marginRight: '16px',
  },
  expandChild: {
    ':hover > *': {
      height: `calc(2 * ${definitions.headerHeight})`,
    }
  },
  spacer: {
    flex: 1,
  },
  linkChildStyle: {
    display: 'block',
    width: '100%',
    height: definitions.headerHeight,
    fontSize: '2em',
    textAlign: 'center',
    lineHeight: `calc(${definitions.headerHeight} * 1.2)`,
  },
  expanderChild: {
    fontSize: '1.4em',
    lineHeight: definitions.headerHeight,
  },
  expander: {
    position: 'absolute',
    height: 0,
    top: definitions.headerHeight,
    width: '100%',
    backgroundColor: definitions.colors.superDarkGrey,
    zIndex: 5,
    overflow: 'hidden',
    transition: `height ease-in-out ${definitions.transitions.fast}`,
  },
});

export default styles;