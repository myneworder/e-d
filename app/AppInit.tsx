import { hot } from "react-hot-loader";
import * as React from "react";
import App from "./App";
import * as PropTypes from "prop-types";
import IntlActions from "actions/IntlActions";
import WalletManagerStore from "stores/WalletManagerStore";
import SettingsStore from "stores/SettingsStore";
import IntlStore from "stores/IntlStore";
import intlData from "./components/Utility/intlData";
import alt from "alt-instance";
import { connect, supplyFluxContext } from "alt-react";
import { IntlProvider } from "react-intl";
import willTransitionTo from "./routerTransition";
import LoadingIndicator from "./components/LoadingIndicator";
import InitError from "./components/InitError";
import SyncError from "./components/SyncError";
import counterpart from "counterpart";
import Radium from "radium";

let { StyleRoot } = Radium;

// class Test extends React.Component<any> {
//   static contextTypes = {
//     router: PropTypes.shape({
//       route: PropTypes.object.isRequired
//     }).isRequired
//   };

//   render() {
//     console.debug("TestComponent: ", this.props, this.context, this);
//     return <h1>Test</h1>;
//   }
// }

/*
* Electron does not support browserHistory, so we need to use hashHistory.
* The same is true for servers without configuration options, such as Github Pages
*/
import { HashRouter, BrowserRouter } from "react-router-dom";
const Router = BrowserRouter;

class RootIntl extends React.Component<any> {
  componentWillMount() {
    IntlActions.switchLocale(this.props.locale);
  }

  render() {
    return (
      <IntlProvider
        locale={this.props.locale}
        formats={intlData.formats}
        initialNow={Date.now()}
      >
        <StyleRoot>
          <Router>
            {/* <Test /> */}
            <App {...this.props} />
          </Router>
        </StyleRoot>
      </IntlProvider>
    );
  }
}

let AppInit = class extends React.Component<any, any> {
  constructor(props) {
    super(props);

    this.state = {
      apiConnected: false,
      apiError: false,
      syncError: null,
      status: ""
    };
  }

  removeLoadingMask = () => {
    let loadingMask = document.getElementById("globalLoading");
    if (loadingMask) {
      loadingMask.classList.add("fade-out");
      setTimeout(() => loadingMask.remove(), 200);
    }
  };

  componentWillMount() {
    // Node Connection Init
    willTransitionTo(true, this._statusCallback.bind(this))
      .then(() => {
        this.setState({
          apiConnected: true,
          apiError: false,
          syncError: null
        });
      })
      .catch(err => {
        console.error("willTransitionTo err:", err);
        this.setState({
          apiConnected: false,
          apiError: true,
          syncError: !err
            ? null
            : (err && err.message).indexOf("ChainStore sync error") !== -1
        });
      })
      .finally(() => {
        this.removeLoadingMask();
      });
  }

  componentDidMount() {
    //Detect OS for platform specific fixes
    if (navigator.platform.indexOf("Win") > -1) {
      var main = document.getElementById("content");
      var windowsClass = "windows";
      if (main.className.indexOf("windows") === -1) {
        main.className =
          main.className + (main.className.length ? " " : "") + windowsClass;
      }
    }
  }

  _statusCallback(status) {
    this.setState({ status });
  }

  render() {
    const { theme, apiServer } = this.props;
    const { apiConnected, apiError, syncError, status } = this.state;

    if (!apiConnected) {
      let server = apiServer;
      if (!!!server) {
        server = "";
      }
      return (
        <div
          style={{ backgroundColor: !theme ? "#2a2a2a" : null }}
          className={theme}
        >
          <div id="content-wrapper">
            <div className="grid-frame vertical">
              {!apiError ? (
                <LoadingIndicator
                  loadingText={
                    status ||
                    counterpart.translate("app_init.connecting", {
                      server: server
                    })
                  }
                />
              ) : syncError ? (
                <SyncError />
              ) : (
                <InitError />
              )}
            </div>
          </div>
        </div>
      );
    }
    return <RootIntl {...this.props} {...this.state} />;
  }
};

AppInit = connect(
  AppInit,
  {
    listenTo() {
      return [IntlStore, WalletManagerStore, SettingsStore];
    },
    getProps() {
      return {
        locale: IntlStore.getState().currentLocale,
        walletMode:
          !SettingsStore.getState().settings.get("passwordLogin") ||
          !!WalletManagerStore.getState().current_wallet,
        theme: SettingsStore.getState().settings.get("themes"),
        apiServer: SettingsStore.getState().settings.get("activeNode", "")
      };
    }
  }
);
AppInit = supplyFluxContext(alt)(AppInit);
export default hot(module)(AppInit);
