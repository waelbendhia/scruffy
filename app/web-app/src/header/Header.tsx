import * as React from 'react';
import { StyleSheet, css } from 'aphrodite/no-important';
import { definitions } from '../shared';
import { Link } from 'react-router-dom';
import HeaderLink from './HeaderLink';
import { IState, history } from '../store';
import { makeToggleSearchAction, makeToggleMenuAction, Action } from './types';
import SearchBar from './SearchBar';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';

const mapStateToProps = (state: IState) => ({
  open: state.header.open,
  menuOpen: state.header.menuOpen,
  location: (state.router.location || history.location).pathname,
});

type StateProps = ReturnType<typeof mapStateToProps>;

const mapDispatchToProps = (dispatch: Dispatch<Action>) => ({
  toggleMenu: () => dispatch(makeToggleMenuAction()),
  toggleSearch: () => dispatch(makeToggleSearchAction()),
});

type DispatchProps = ReturnType<typeof mapDispatchToProps>;

type MergedProps = StateProps & DispatchProps;

const View = (props: MergedProps) => {
  const { location, open, menuOpen } = props;
  const styles = StyleSheet.create({
    header: {
      position: 'sticky',
      top: 0,
      display: 'flex',
      alignItems: 'center',
      flexDirection: 'row',
      height: definitions.headerHeight,
      backgroundColor: definitions.colors.black,
      color: definitions.colors.white,
      paddingLeft: `calc(${definitions.headerHeight} / 2)`,
      paddingRight: `calc(${definitions.headerHeight} / 2)`,
      zIndex: 5,
    },
    search: {
      '@media (max-width: 860px)': { order: 2 }
    },
    links: {
      overflow: 'visible',
      display: 'flex',
      flexDirection: 'row',
      '@media (max-width: 860px)': {
        position: 'absolute',
        flexDirection: 'column',
        backgroundColor: definitions.colors.superDarkGrey,
        transition: `left ${definitions.transitions.fast} ease`,
        left: menuOpen ? 0 : '-136px',
        top: definitions.headerHeight,
        height: '100vh',
      }
    },
    icon: {
      color: definitions.colors.white,
      fontSize: '30px !important',
      transition: `color ease-in ${definitions.transitions.fast}`,
      ':hover': { color: definitions.colors.primary }
    },
    siteTitle: {
      left: '50%',
      position: 'absolute',
      display: 'block',
      height: definitions.headerHeight,
      lineHeight: definitions.headerHeight,
      fontFamily: definitions.fonts.heading,
      fontWeight: 'bold',
      color: definitions.colors.white,
      fontSize: '3em',
      transform: 'translateX(-50%)',
      pointerEvents: location === '/' || open ? 'none' : 'auto',
      opacity: location === '/' || open ? 0 : 1,
      '@media (max-width: 860px)': {
        left: 'unset',
        right: '16px',
        transform: 'unset',
        fontSize: '1.5em',
      }
    },
    show: {
      pointerEvents: open ? 'none' : 'auto',
      opacity: open ? 0 : 1,
      transition: `opacity ease-in-out ${definitions.transitions.fast}`,
    },
    spacer: {
      flex: 1,
      '@media (max-width: 860px)': { order: 3 }
    },
    burger: {
      width: 0,
      marginRight: '8px',
      display: 'none',
      '@media (max-width: 860px)': {
        order: 0,
        width: 'initial',
        display: 'initial',
      }
    },
  });

  return (
    <div className={css(styles.header)}>
      <Link to='/' className={css(styles.siteTitle)}>
        Scaruffi2.0
      </Link>
      <a
        className={css(styles.burger)}
        onClick={props.toggleMenu}
      >
        <i className={css(styles.icon) + ' material-icons'}>
          {menuOpen ? 'close' : 'menu'}
        </i>
      </a>
      <a
        className={css(styles.search)}
        onClick={props.toggleSearch}
      >
        <i className={css(styles.icon) + ' material-icons'}>
          {open ? 'close' : 'search'}
        </i>
      </a>
      <div className={css(styles.spacer)} />
      <div className={css(styles.links)}>
        {[
          {
            text: 'Music',
            link: '/bands',
            options: [
              { text: 'Bands', link: '/bands' },
              { text: 'Albums', link: '/albums' },
            ],
          },
          {
            text: 'Film',
            link: '/films',
            options: [
              { text: 'Directors', link: '/directors' },
              { text: 'Films', link: '/films' },
            ],
          }
        ].map(x =>
          <div className={css(styles.show)} key={x.text}>
            <HeaderLink {...x} location={location.substr(1)} />
          </div>
        )}
      </div>
      <SearchBar />
    </div>
  );
};

export default connect(mapStateToProps, mapDispatchToProps)(View);