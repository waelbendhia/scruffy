import * as React from 'react';
import { definitions } from '../shared';
import { StyleSheet, css } from 'aphrodite/no-important';
import { Link, LinkProps } from 'react-router-dom';

interface IProps {
  bgUrl: string;
  url?: string;
  children: React.ReactNode;
}

const SmallCard = ({ bgUrl, url, children }: IProps) => {
  const styles = StyleSheet.create({
    card: {
      padding: '6%',
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      flexDirection: 'column',
      backgroundColor: definitions.colors.white,
      color: definitions.colors.black,
      noHover: { pointerEvents: !url ? 'none' : 'auto' },
      ':hover > span': {
        left: 0,
        width: '100%',
      },
      ':hover > div::after': { opacity: 1 },
    },
    label: {
      width: '100%',
      whiteSpace: 'nowrap',
      textOverflow: 'ellipsis',
      overflow: 'hidden',
      textAlign: 'center',
      fontSize: '24px',
      bottom: 0,
    },
    image: {
      position: 'relative',
      width: '100%',
      flex: 1,
      backgroundColor: definitions.colors.darkGrey,
      backgroundImage: `url(${bgUrl})`,
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundSize: 'cover',
      overflow: 'hidden',
      '::after': {
        content: `''`,
        'mix-blend-mode': 'color',
        position: 'absolute',
        opacity: 0,
        width: '100%',
        height: '100%',
        backgroundColor: definitions.colors.primary,
        transition: `opacity ease-in-out ${definitions.transitions.fast}`,
      },
    },
    border: {
      height: '1px',
      width: '80%',
      marginTop: '12px',
      marginBottom: '16px',
      backgroundColor: definitions.colors.black,
    },
    highlight: {
      position: 'absolute',
      left: '50%',
      bottom: 0,
      width: 0,
      height: '2px',
      backgroundColor: definitions.colors.primary,
      transition: `width ease-out ${definitions.transitions.fast}, 
                 left ease-out ${definitions.transitions.fast}`,
    },
  });
  const Elem = (props: Partial<LinkProps>) =>
    !!url
      ? <Link {...props} to={`/bands/${url.split('.')[0]}`} />
      : <span {...props} />;

  return (
    <Elem className={css(styles.card)}>
      <div className={css(styles.image)} />
      <div className={css(styles.border)} />
      <div className={css(styles.label)}>{children}</div>
      <span className={css(styles.highlight)} />
    </Elem>
  );
};

export default SmallCard;