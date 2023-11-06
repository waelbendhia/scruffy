import * as React from 'react';
import { Band, AlbumView, definitions, Album, SmallCard } from '../shared';
import { StyleSheet, css } from 'aphrodite/no-important';
// @ts-ignore
import defaultBandImage from '../bands/bandDefault.svg';

const styles = StyleSheet.create({
  header: {
    background: definitions.colors.black,
    position: 'relative',
    width: '100%',
    height: `calc(70vh - ${definitions.headerHeight})`,
    marginBottom: '5vh',
    zIndex: 1,
    overflow: 'hidden',
  },
  headerElem: {
    top: '12%',
    position: 'absolute',
    width: '40%',
    height: '80%',
  },
  bandImage: {
    backgroundColor: definitions.colors.darkGrey,
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    backgroundSize: 'cover',
    left: '52%',
    zIndex: 1,
  },
  headerTitle: {
    right: '52%',
    display: 'flex',
    flexDirection: 'column',
    color: definitions.colors.white,
    lineHeight: '80px',
    fontWeight: 700,
    fontFamily: definitions.fonts.heading,
    borderBottom: `1px solid ${definitions.colors.white}`,
    borderTop: `1px solid ${definitions.colors.white}`,
  },
  borderBottom: {
    marginLeft: '5%',
    width: '90%',
    height: '2px',
    backgroundColor: definitions.colors.primary,
  },
  bioBorder: { marginTop: '96px' },
  albumBorder: { marginTop: '32px' },
  spacer: { flex: 1 },
  headerBandName: {
    fontSize: '64px',
    overflow: 'hidden',
    position: 'relative',
    lineHeight: '1.2em',
    margin: 0,
    maxHeight: 'calc(100% - 80px)',
    flexBasis: 'auto',
    flexShrink: 0,
    flexGrow: 0,
  },
  bottomLink: {
    overflow: 'hidden',
    bottom: 0,
    height: '80px',
    fontSize: '20px',
  },
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  bio: {
    paddingLeft: '2em',
    paddingRight: '2em',
    paddingBottom: '3em',
    background: definitions.colors.white,
    maxWidth: '740px',
  },
  bioParagraph: {
    fontWeight: 400,
    minHeight: '91px',
    fontSize: '21px',
    lineHeight: '31px',
    marginTop: '38px',
    '::first-letter': {
      fontFamily: definitions.fonts.heading,
      float: 'left',
      marginRight: '0.4em',
      fontSize: '65px',
      borderRight: `1px solid ${definitions.colors.primary}`,
      padding: '0.45em 0.6em 0.45em 0',
    },
  },
  body: {
    alignSelf: 'stretch',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingLeft: '24px',
    paddingRight: '24px',
  },
});

const BandView = ({ name, bio, albums, relatedBands, imageUrl }: Band) => {
  const bg = StyleSheet.create({
    bg: { backgroundImage: `url(${imageUrl || defaultBandImage})` },
  }).bg;
  return (
    <div className={css(styles.container)}>
      <div className={css(styles.header)}>
        <div className={css(styles.bandImage, styles.headerElem, bg)} />
        <div className={css(styles.headerElem, styles.headerTitle)}>
          <div className={css(styles.spacer)} />
          <h1 className={css(styles.headerBandName)}>{name}</h1>
          <div className={css(styles.spacer)} />
          <a className={css(styles.bottomLink)} href={''} target="_blank">
            Read on Scaruffi.com
          </a>
        </div>
      </div>
      <div className={css(styles.body)}>
        <div className={css(styles.spacer)} />
        <Bio bio={bio || ''} />
        <Albums albums={albums || []} />
        <div className={css(styles.spacer)} />
      </div>
      <Related bands={relatedBands || []} />
    </div>
  );
};

const Bio = ({ bio }: { bio: string }) => (
  <div className={css(styles.bio)}>
    {bio
      .split('\n')
      .filter((t) => t.trim() !== '')
      .map((text, i) => (
        <p key={i} className={css(styles.bioParagraph)}>
          {text}
        </p>
      ))}
    <div className={css(styles.borderBottom, styles.bioBorder)} />
  </div>
);

const Albums = ({ albums }: { albums: Album[] }) => {
  const albumStyles = StyleSheet.create({
    albums: {
      paddingBottom: '2em',
      backgroundColor: definitions.colors.white,
      flexShrink: 0,
      maxWidth: '400px',
      marginLeft: '2%',
      display: 'grid',
      gridTemplateRows: `repeat(${albums.length}, 8em)`,
      minWidth: '180px',
      flexDirection: 'column',
      flexGrow: 1,
    },
  });
  return (
    <div className={css(albumStyles.albums)}>
      {albums
        .sort((a, b) =>
          b.rating - a.rating === 0
            ? (b.year || 0) - (a.year || 0) === 0
              ? b.name.localeCompare(a.name)
              : (b.year || 0) - (a.year || 0)
            : b.rating - a.rating
        )
        .map((a) => (
          <AlbumView key={(a.band ? a.band.url : '') + a.name} {...a} />
        ))}
      <div className={css(styles.borderBottom, styles.albumBorder)} />
    </div>
  );
};

const Related = ({ bands }: { bands: Band[] }) => {
  const relStyles = StyleSheet.create({
    container: {
      backgroundColor: definitions.colors.white,
      padding: '16px',
      marginTop: '64px',
      width: '100%',
      maxWidth: 'calc(1140px + 2em)',
    },
    bandsContainer: {
      display: 'grid',
      width: '100%',
      gridTemplateColumns: 'repeat(5, 20%)',
      gridAutoRows: '25vh',
    },
  });
  return (
    <div className={css(relStyles.container)}>
      <h1 style={{ marginLeft: '5%' }}>Similar Artists</h1>
      <div className={css(relStyles.bandsContainer)}>
        {(bands || []).map((b) => (
          <SmallCard key={b.url} bgUrl={b.imageUrl || defaultBandImage} {...b}>
            {b.name}
          </SmallCard>
        ))}
      </div>
    </div>
  );
};

export default BandView;
