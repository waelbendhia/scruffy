import { createStore, applyMiddleware, combineReducers, compose } from 'redux';
import {
  RouterState,
  routerMiddleware,
  connectRouter,
} from 'connected-react-router';
import { createBrowserHistory } from 'history';
import createSagaMiddleware from 'redux-saga';
import { HomeState, homeReducer, homeEffects } from './home';
import { BandsState, bandsReducer, bandsEffects } from './bands';
import { albumsReducer, albumsEffects, AlbumsState } from './albums';
import { bandReducer, bandEffects, BandState } from './band';
import {
  reducer as headerReducer,
  effects as headerEffects,
} from './header/state';
import { IState as HeaderState } from './header/types';

const sagaMiddleware = createSagaMiddleware();
const history = createBrowserHistory();

interface IState {
  router: RouterState;
  home: HomeState;
  bands: BandsState;
  albums: AlbumsState;
  band: BandState;
  header: HeaderState;
}

const composeEnhancers =
  // @ts-ignore
  window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

const store = createStore(
  combineReducers({
    bands: bandsReducer,
    router: connectRouter(history),
    home: homeReducer,
    albums: albumsReducer,
    band: bandReducer,
    header: headerReducer,
  }),
  undefined,
  composeEnhancers(applyMiddleware(routerMiddleware(history), sagaMiddleware))
);

sagaMiddleware.run(homeEffects);
sagaMiddleware.run(bandsEffects);
sagaMiddleware.run(albumsEffects);
sagaMiddleware.run(bandEffects);
sagaMiddleware.run(headerEffects);

export default store;
export { IState, history };
