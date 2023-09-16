import * as React from 'react';
import { StyleSheet, css } from 'aphrodite/no-important';
import { definitions, Input } from '../shared';
import { IState } from '../store';
import { makeSearchAction, makeToggleSearchAction, Action } from './types';
import HLabeledImage from '../shared/LabeledImage';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';
// @ts-ignore
import defaultBandImage from '../bands/bandDefault.svg';

const mapStateToProps = ({ header }: IState) => ({
  open: header.open,
  searchValue: header.search,
  bands: header.bands,
  albums: header.albums,
});

type StateProps = ReturnType<typeof mapStateToProps>;

const mapDispatchToProps = (dispatch: Dispatch<Action>) => ({
  search: (v: string) => dispatch(makeSearchAction(v)),
  toggleSearch: () => dispatch(makeToggleSearchAction()),
});

type DispatchProps = ReturnType<typeof mapDispatchToProps>;

type MergedProps = StateProps & DispatchProps;

const SearchBar = (props: MergedProps) => {
  const { albums, bands, open, search, searchValue, toggleSearch } = props;
  const styles = StyleSheet.create({
    searchView: {
      display: 'flex',
      left: 0,
      position: 'absolute',
      flexDirection: 'column',
      alignItems: 'stretch',
      height: open ? `calc(100vh - ${definitions.headerHeight})` : 0,
      opacity: open ? 1 : 0,
      top: definitions.headerHeight,
      width: '100%',
      backgroundColor: definitions.colors.blackTransparent,
      transition: open
        ? `opacity ease-in-out ${definitions.transitions.fast}`
        : `opacity ease-in-out ${definitions.transitions.fast},` +
          `height 0s linear ${definitions.transitions.fast}`,
      overflow: 'hidden',
      ':focus': { outline: 'none' },
    },
    searchBar: {
      paddingLeft: '32px',
      paddingRight: '32px',
      width: 'calc(100% - 64px)',
      height: open ? '70%' : 0,
      backgroundColor: definitions.colors.black,
      transition: `height ease-in-out ${definitions.transitions.fast}`,
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gridTemplateRows: '40px',
      gridGap: '8px',
    },
    searchInput: {
      color: definitions.colors.white,
      gridColumn: 'span 2',
    },
    show: {
      transition: `opacity ease-in-out ${definitions.transitions.fast}`,
    },
    resultGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr',
      gridTemplateRows: 'repeat(3, 1fr)',
    },
    hide: { pointerEvents: 'none', opacity: 0 },
    spacer: { flex: 1 },
    text: { overflow: 'hidden' },
  });

  return (
    <div className={css(styles.searchView)}>
      <div className={css(styles.searchBar)}>
        <Input
          whiteText={true}
          className={css(styles.searchInput, styles.show, !open && styles.hide)}
          icon="search"
          type="text"
          value={searchValue}
          onChange={search}
        />
        <div className={css(styles.resultGrid)}>
          {bands.map((b) => (
            <HLabeledImage
              key={b.name}
              url={b.url}
              imageUrl={b.imageUrl || defaultBandImage}
              whiteText={true}
            >
              <div className={css(styles.text)}>{b.name}</div>
            </HLabeledImage>
          ))}
        </div>
        <div className={css(styles.resultGrid)}>
          {albums.map((a) => (
            <HLabeledImage
              key={a.name}
              url={a.band ? a.band.url : ''}
              imageUrl={a.imageUrl || ''}
              whiteText={true}
            >
              <div className={css(styles.text)}>
                <div>{!!a.band ? a.band.name : ''}</div>
                <div>
                  <b>{a.name}</b>
                </div>
              </div>
            </HLabeledImage>
          ))}
        </div>
      </div>
      <div className={css(styles.spacer)} onClick={toggleSearch} />
    </div>
  );
};

export default connect(mapStateToProps, mapDispatchToProps)(SearchBar);
