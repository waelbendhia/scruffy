import * as React from 'react';
import { StyleSheet, css } from 'aphrodite/no-important';
import { definitions, styles as sharedStyles } from '../shared';

const styles = StyleSheet.create({
  footer: {
    display: 'flex',
    fontWeight: 200,
    justifyContent: 'center',
    float: 'left',
    width: '100%',
    backgroundColor: definitions.colors.darkGrey,
    color: definitions.colors.darkWhite,
    '@media (max-width: 700px)': { flexDirection: 'column' },
  },
  container: {
    margin: '40px',
    '@media (max-width: 700px)': { margin: '20px' },
  },
  credit: { flex: 1 },
  credits: {
    display: 'flex',
    flexDirection: 'column',
    '@media (max-width: 700px)': { flexDirection: 'row' },
  },
  first: { flex: 2 },
  second: { flex: 1 },
  link: {
    fontWeight: 400,
    color: definitions.colors.white,
  },
  paragraph: {
    fontSize: '1.4em',
    marginTop: '8px',
    marginBottom: '8px',
    '@media (max-width: 700px)': { fontSize: '1.1em' },
  },
  ul: {
    listStyle: 'none',
    marginLeft: '15px',
    fontSize: '1.3em',
    '@media (max-width: 700px)': { fontSize: '1em' },
  }
});

export default () => (
  <div className={css(styles.footer, sharedStyles.elevation3)}>
    <div className={css(styles.container, styles.first)}>
      <h1>About:</h1>
      <p className={css(styles.paragraph)}>
        This app is a loving homage to a man who has dedicated a lot
        of time to obsessively cataloguing his opinions on just about every
        band or musician known to the western world.
        </p>
      <p className={css(styles.paragraph)}>
        App built and designed by&nbsp;
        <a className={css(styles.link)} href='http://waelbendhia.github.io/'>
          Wael Ben Dhia
        </a>.
        </p>
      <p className={css(styles.paragraph)}>
        Content from&nbsp;
        <a className={css(styles.link)} href='http://scaruffi.com/'>
          Piero Scaruffi's website
        </a>&nbsp;
        and formatted as best as possible.
        Errors are aplenty as the original website is not the most organized
        and consistent in format. For more information on the band and
        Scaruffi's opinions on them I urge you to visit his website.
      </p>
      <p className={css(styles.paragraph)}>
        Powered by&nbsp;
        <a className={css(styles.link)} href='https://www.last.fm'>last.fm</a>
      </p>
    </div>
    <div className={css(styles.container, styles.second)}>
      <h1>Contact:</h1>
      <div className={css(styles.credits)}>
        <div className={css(styles.credit)}>
          <p className={css(styles.paragraph)}>Wael Ben Dhia</p>
          <ul className={css(styles.ul)}>
            <li>
              <a
                className={css(styles.link)}
                href='http://waelbendhia.github.io/'
              >
                Website
              </a>
            </li>
            <li>
              <a className={css(styles.link)} href='mailto:'>
                Email
            </a>
            </li>
          </ul>
        </div>
        <div className={css(styles.credit)}>
          <p className={css(styles.paragraph)}>Piero Scaruffi</p>
          <ul className={css(styles.ul)}>
            <li>
              <a className={css(styles.link)} href='http://scaruffi.com/'>
                Website
            </a>
            </li>
            <li>
              <a className={css(styles.link)} href='mailto:p@scaruffi.com'>
                Email
            </a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
);