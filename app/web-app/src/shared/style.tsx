import { StyleSheet } from 'aphrodite/no-important';

const definitions = {
  fonts: {
    heading: ['Libre Baskerville', 'serif'],
    body: ['Work Sans', 'sans-serif'],
  },
  headerHeight: '60px',
  colors: {
    black: '#1A1A1A',
    blackTransparent: 'rgba(26, 26, 26, 0.84)',
    grey: '#5E5E5E',
    lessDarkGrey: '#424242',
    darkGrey: '#404040',
    superDarkGrey: '#242424',
    white: '#fff',
    lessDarkWhite: '#F2F2F2',
    darkWhite: '#eee',
    whiteTransparent: 'rgba(255, 255, 255, 0.75)',
    primary: '#FF3530',
    accent: '#55DDE0',
    shadow: 'rgba(0, 0, 0, 0.23)',
  },
  transitions: {
    verySlow: '0.6s',
    slow: '0.3s',
    fast: '0.15s',
  }
};

const styles = StyleSheet.create({
  elevation1: {
    boxShadow:
      '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)'
  },
  elevation2: {
    boxShadow:
      '0 3px 6px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.23)'
  },
  elevation3: {
    boxShadow:
      '0 6px 6px rgba(0, 0, 0, 0.23), 0 10px 20px rgba(0, 0, 0, 0.19)'
  },
  elevation4: {
    boxShadow:
      '0 14px 28px rgba(0, 0, 0, 0.25), 0 10px 10px rgba(0, 0, 0, 0.22)'
  },
  elevation5: {
    boxShadow:
      '0 19px 38px rgba(0, 0, 0, 0.30), 0 15px 12px rgba(0, 0, 0, 0.22)'
  },
  card: {
    backgroundColor: definitions.colors.white,
    borderRadius: '2px',
  },
  elevate: {
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
    transition: `transform ease-in-out ${definitions.transitions.fast}`,
    ':hover': {
      zIndex: 1,
      transform: 'scale(1.04) translateY(0%)',
      ':after': {
        opacity: 1,
      }
    },
    ':after': {
      pointerEvents: 'none',
      zIndex: 0,
      content: `''`,
      position: 'absolute',
      left: 0,
      top: 0,
      width: '100%',
      height: '100%',
      boxShadow: '0 10px 10px rgba(0, 0, 0, 0.22),' +
        ' 0 14px 28px rgba(0, 0, 0, 0.25)',
      opacity: 0,
      transition: `opacity var(${definitions.transitions.fast}) ease-in-out`,
    },
  },
});

export { styles, definitions };