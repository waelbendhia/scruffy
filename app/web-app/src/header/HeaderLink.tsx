import * as React from 'react';
import { StyleSheet, css } from 'aphrodite/no-important';
import { definitions } from '../shared';
import { Link } from 'react-router-dom';

const styles = StyleSheet.create({
  linkStyle: {
    position: 'relative',
    height: definitions.headerHeight,
    width: '120px',
    marginRight: '16px',
    ':hover > span': {
      width: '100%',
    },
    '@media (max-width: 860px)': {
      display: 'flex',
      flexDirection: 'column',
      height: 'auto',
    }
  },
  expandChild: {
    ':hover > div': {
      height: `calc(2 * ${definitions.headerHeight})`,
    }
  },
  linkChildStyle: {
    display: 'block',
    width: '100%',
    height: definitions.headerHeight,
    fontSize: '2em',
    textAlign: 'center',
    fontWeight: 'lighter',
    color: definitions.colors.white,
    lineHeight: `calc(${definitions.headerHeight} * 1.2)`,
    '@media (max-width: 860px)': { textAlign: 'right' }
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
    transition: `height ease-in-out ${definitions.transitions.fast}`,
    overflow: 'hidden',
    '@media (max-width: 860px)': {
      position: 'initial',
      height: 'auto',
    }
  },
  highlight: {
    position: 'absolute',
    left: '50%',
    bottom: 0,
    width: 0,
    height: '2px',
    transform: 'translateX(-50%)',
    backgroundColor: definitions.colors.primary,
    transition: `width ease-out ${definitions.transitions.fast}`,
  },
  selected: { width: '100%' }
});

interface IHeaderLink {
  text: string;
  link: string;
}
interface IProps extends IHeaderLink {
  location: string;
  options: IHeaderLink[];
}

const View =
  ({ text, location, link, options }: IProps) => (
    <div className={css(styles.linkStyle, styles.expandChild)}>
      <Link className={css(styles.linkChildStyle)} to={link}>{text}</Link>
      <span
        className={css(
          styles.highlight,
          [link, ...options.map(o => o.link)].some(l => l === `/${location}`)
            ? styles.selected
            : null,
        )}
      />
      <div className={css(styles.expander)}>
        {options.map(
          o => (
            <Link
              key={o.link}
              className={css(styles.linkChildStyle, styles.expanderChild)}
              to={o.link}
            >
              {o.text}
            </Link>
          )
        )}
      </div>
    </div>
  );

export default View;