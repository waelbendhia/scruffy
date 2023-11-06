import * as React from 'react';
import { Route, Switch } from 'react-router-dom';
import Home from '../home';
import { CSSTransition, TransitionGroup } from 'react-transition-group';
import Bands from '../bands';
import Albums from '../albums';
import Directors from '../directors';
import Films from '../films';
import Band from '../band';
import { StyleSheet, css } from 'aphrodite/no-important';
import { definitions } from '../shared';
import { Location } from 'history';
import { IState, history } from '../store';
import { connect } from 'react-redux';

const styles = StyleSheet.create({
  body: { minHeight: `calc(100vh - ${definitions.headerHeight})` },
  enter: {
    opacity: 0,
    transform: 'translateY(10px)',
    transitionDuration: definitions.transitions.slow,
  },
  enterActive: {
    opacity: 1,
    position: 'absolute',
    width: '100%',
    transform: 'translateY(0px)',
  },
  exit: {
    opacity: 1,
    transform: 'translateY(0px)',
  },
  exitActive: {
    opacity: 0,
    position: 'absolute',
    width: '100%',
    transform: 'translateY(10px)',
    transitionDuration: definitions.transitions.slow,
  },
});

interface IStateProps {
  location: Location;
}

const mapStateToProps = (state: IState): IStateProps => ({
  location: (state.router.location || history.location),
});

const View = ({ location }: IStateProps) => (
  <TransitionGroup className={css(styles.body)}>
    <CSSTransition
      key={location.pathname}
      timeout={300}
      classNames={{
        appear: css(styles.enter),
        appearActive: css(styles.enterActive),
        enter: css(styles.enter),
        enterActive: css(styles.enterActive),
        exit: css(styles.exit),
        exitActive: css(styles.exitActive),
      }}
    >
      <Switch location={location}>
        <Route exact={true} path='/' >
          <Home />
        </Route>
        <Route exact={true} path='/bands' >
          <Bands />
        </Route>
        <Route path='/bands/:vol/:band' >
          <Band />
        </ Route>
        <Route exact={true} path='/albums' >
          <Albums />
        </Route>
        <Route exact={true} path='/directors'>
          <Directors />
        </Route>
        <Route exact={true} path='/films' >
          <Films />
        </Route>
      </Switch>
    </CSSTransition>
  </TransitionGroup>
);

export default connect(mapStateToProps)(View);
