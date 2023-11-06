import * as React from 'react';
import Header from './header';
import Background from './background';
import Body from './body';
import Footer from './footer';
import DocumentTitle from 'react-document-title';
import { Provider } from 'react-redux';
import store, { history } from './store';
import { Router } from 'react-router';

const App = () => (
  <Provider store={store}>
    <Router history={history}>
      <DocumentTitle title='Scaruffi2.0'>
        <div>
          <link
            href='https://fonts.googleapis.com/icon?family=Material+Icons'
            rel='stylesheet'
          />
          <Header />
          <Background />
          <Body />
          <Footer />
        </div>
      </DocumentTitle>
    </Router>
  </Provider>
);

export default App;
