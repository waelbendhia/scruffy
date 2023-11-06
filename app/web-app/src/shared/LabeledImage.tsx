import * as React from 'react';
import { definitions } from '../shared';
import { StyleSheet, css } from 'aphrodite/no-important';
import { Link, LinkProps } from 'react-router-dom';
// @ts-ignore
import defaultImage from '../albums/albumDefault.svg';

interface IProps {
  imageUrl: string;
  url?: string;
  children: React.ReactNode;
  whiteText?: boolean;
}

const HLabeledImage = ({ url, imageUrl, children, whiteText }: IProps) => {
  const styles = StyleSheet.create({
    container: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      position: 'relative',
      width: '100%',
      pointerEvents: !url ? 'none' : 'auto',
      ':hover > span': {
        left: 0,
        width: '100%',
      },
      ':hover > div::after': { opacity: 1 },
      color: whiteText ? definitions.colors.white : definitions.colors.black,
    },
    label: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'flex-start',
      alignItems: 'center',
      position: 'absolute',
      top: 0,
      left: '40%',
      width: '60%',
      height: '100%',
      whiteSpace: 'nowrap',
      textOverflow: 'ellipsis',
      overflow: 'hidden',
      fontSize: '24px',
      bottom: 0,
    },
    ellipsis: {
      whiteSpace: 'nowrap',
      textOverflow: 'ellipsis',
      overflow: 'hidden',
    },
    border: {
      height: '70%',
      width: '1px',
      minWidth: '1px',
      marginLeft: '12px',
      marginRight: '16px',
      backgroundColor: whiteText
        ? definitions.colors.white
        : definitions.colors.black,
    },
    labelText: {
      height: '90%',
      display: 'flex',
      maxWidth: 'calc(100% - 37px)',
      flexDirection: 'column',
      justifyContent: 'space-around',
      backgroundColor: whiteText
        ? definitions.colors.white
        : definitions.colors.black,
    },
    image: {
      marginLeft: '8px',
      backgroundColor: definitions.colors.darkGrey,
      width: 'calc(40% - 16px)',
      height: 'calc(100% - 16px)',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundSize: 'cover',
      overflow: 'hidden',
      backgroundImage: `url(${imageUrl || defaultImage})`,
      '::after': {
        content: `''`,
        'mix-blend-mode': 'color',
        position: 'absolute',
        opacity: 0,
        width: 'calc(40% - 16px)',
        height: 'calc(100% - 16px)',
        backgroundColor: definitions.colors.primary,
        transition: `opacity ease-in-out ${definitions.transitions.fast}`,
      },
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
    !!url ? (
      <Link {...props} to={`/bands/${url.split('.')[0]}`} />
    ) : (
      <span {...props} />
    );

  return (
    <Elem className={css(styles.container)}>
      <div className={css(styles.image)} />
      <div className={css(styles.label)}>
        <div className={css(styles.border)} />
        {children}
      </div>
      <span className={css(styles.highlight)} />
    </Elem>
  );
};

export default HLabeledImage;
