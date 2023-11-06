import * as React from 'react';
import { styles as sharedStyles } from '../shared';
import { StyleSheet, css } from 'aphrodite/no-important';
import styles from './styles';

const height = (h: number, max: number) =>
  StyleSheet.create({
    bar: {
      height: `${100 * h / max}%`,
      backgroundColor: 'red',
      'align-self': 'end',
      justifySelf: 'center',
      width: '80%',
    }
  });

const ratingsToArray = (ratings: { [rating: string]: number }): number[] => {
  const sanRatings = Object.keys(ratings)
    .map(n => ({
      rating: parseFloat(n),
      count: ratings[n]
    })).
    sort((a, b) => a.rating - b.rating);
  return new Array(20)
    .fill(0)
    .map(
      (_, i) =>
        (
          sanRatings.find(({ rating }) => rating * 2 === i) ||
          { count: 0 }
        ).count
    );
};

const RatingHistogram = (props: { [rating: string]: number }) => {
  const ratings = ratingsToArray(props),
    max = Math.max(...ratings);
  return (
    <div
      className={css(
        sharedStyles.card,
        sharedStyles.elevation4,
        styles.histogram,
      )}
    >
      {ratings.map((c, i) =>
        <span
          key={'c' + i}
          className={css(styles.cell, height(c, max).bar)}
        />
      )}
      {ratings.map((_, i) =>
        <span
          key={'i' + i}
          className={css(styles.cell)}
        >
          {i / 2}
        </span>
      )}
    </div>
  );
};

export default RatingHistogram;