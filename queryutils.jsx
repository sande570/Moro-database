
// Assumes URI, React, lodash, and jquery are available.

function CurrentURI() {
  return new URI(window.location.href);
}

function CurrentMetaURI() {
  return new URI(CurrentURI().hash().slice(1));
}

function GetQuery() {
  var current_uri = CurrentMetaURI();
  return current_uri.search(true);
}

function GetQueryString() {
  var current_uri = CurrentMetaURI();
  return current_uri.search(true);
}

var SetQuery = function(object) {
  if (object != GetQuery()) {
    var current_uri = CurrentMetaURI();
    current_uri.search(object)
    window.location.hash = current_uri.toString();
  }
}

function UpdateQuery(mergeobject) {
  var query = GetQuery();
  SetQuery(_.merge(query, mergeobject))
}

var UrlParameterExtractor = React.createClass({
  getInitialState: function() {
    return {childprops: this.GetChildProps()};
  },
  GetImportantKeys: function() {
    if (!this.props.defaults) {
      return [];
    }
    return _.keys(this.props.defaults);
  },
  GetChildProps: function() {
    var q = GetQuery();
    var picked = _.pick(q, this.GetImportantKeys());
    var vals = _.mapValues(picked, function(val, key) {
      if (typeof(this.props.defaults[key]) == "object") {
        if (val) {
          return JSON.parse(val);
        } else {
          return {};
        }
      }
      return val;
    }.bind(this));
    return _.merge(this.props.defaults, vals);
  },
  componentWillUnmount: function() {
    $(window).off('hashchange', this._hashhandler);
  },
  componentDidMount: function() {
    this._hashhandler = function hashhandler() {
      this.setState({childprops: this.GetChildProps()});
    }.bind(this);
    $(window).on('hashchange', this._hashhandler);
  },
  render: function() {
    var child = React.Children.only(this.props.children);
    var newchild = React.cloneElement(child, this.state.childprops);
    return <div>{newchild}</div>
  }
});

var UrlParameterLink = React.createClass({
  HandleClick: function(e) {
    e.preventDefault();
    UpdateQuery(this.props.update);
    return false;
  },
  render: function() {
    return <a href="#" onClick={this.HandleClick}>{this.props.children}</a>
  }
})


var UrlParameterButton = React.createClass({
  HandleClick: function(e) {
    e.preventDefault();
    UpdateQuery(this.props.update);
    return false;
  },
  render: function() {
    if (this.props.custom_style) {
      return <div className="ui button"
                  style={this.props.custom_style}
                  onClick={this.HandleClick}>
               {this.props.children}
             </div>
    }
    return <div className="ui button" onClick={this.HandleClick}>{this.props.children}</div>
  }
})
