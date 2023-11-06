import * as React from 'react';
import { StyleSheet, css } from 'aphrodite/no-important';
import { definitions } from '../shared';

const styles = StyleSheet.create({
  background: {
    position: 'fixed',
    top: 0,
    left: 0,
    minWidth: '100%',
    minHeight: '100vh',
    fontSize: '6vh',
    backgroundColor: definitions.colors.darkWhite,
    color: definitions.colors.lessDarkWhite,
    filter: 'blur(1px)',
    zIndex: -1,
    userSelect: 'none',
  },
});

const View = () => (
  <div className={css(styles.background)}>
    The fact that so many books still name the Beatles as "the greatest
    or most significant or most influential" rock band ever only tells
    you how far rock music still is from becoming a serious art. Jazz
    critics have long recognized that the greatest jazz musicians of all
    times are Duke Ellington and John Coltrane, who were not the most
    famous or richest or best sellers of their times, let alone of all
    times. Classical critics rank the highly controversial Beethoven over
    classical musicians who were highly popular in courts around Europe.
    Rock critics are still blinded by commercial success. The Beatles
    sold more than anyone else (not true, by the way), therefore they must
    have been the greatest. Jazz critics grow up listening to a lot of
    jazz music of the past, classical critics grow up listening to a lot
    of classical music of the past. Rock critics are often totally
    ignorant of the rock music of the past, they barely know the best
    sellers. No wonder they will think that the Beatles did anything
    worthy of being saved.
  </div>
);

export default View;