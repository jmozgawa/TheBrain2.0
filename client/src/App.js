import React, { Component } from 'react';
import logo from './logo_thebrain.jpg';
import './App.css';
import Tutorial from './components/Tutorial';
import WellDone from './components/WellDone';
import Questions from './components/Questions';
import Footer from './components/Footer';

import { Match, BrowserRouter } from 'react-router';

import { ApolloClient ,createNetworkInterface } from 'apollo-client';
import { ApolloProvider } from 'react-apollo';

const client = new ApolloClient({
    networkInterface: createNetworkInterface({ uri: 'http://localhost:8080/graphql' }),
});

class App extends Component {
    render() {
        return (
            <BrowserRouter>
                <ApolloProvider client={client}>
                    <div className="App">
                        <div className="App-header">
                            <img src={logo} className="App-logo" alt="logo"/>
                            <h2 className="make-it-bigger">Welcome to TheBrain.Pro</h2>
                        </div>
                        <div className="App-intro styleIntroduction">

                            <Match exactly pattern="/" component={Tutorial} />
                            <Match exactly pattern="/wellDone" component={WellDone}/>
                            <Match exactly pattern="/questions" component={Questions}/>
                            <Footer/>
                        </div>
                    </div>
                </ApolloProvider>
            </BrowserRouter>
        );
    }
}

export default App;
