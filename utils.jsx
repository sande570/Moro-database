
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

function GetVar(key, default_value) {
  return _.get(GetQuery(), [key], default_value);
}

function GetQueryString() {
  var current_uri = CurrentMetaURI();
  return current_uri.search(true);
}

function GetPaginationControls(skip, length, pagesize) {
  skip = Math.max(0, Math.min(skip, length-pagesize));
  var endskip = Math.max(0, length-pagesize);
  var prevskip = Math.max(0, skip-pagesize);
  var nextskip = Math.max(0, Math.min(length-pagesize, skip+pagesize));
  var lastshown = Math.max(0, Math.min(length, skip+pagesize));
  var page_controls;
  if (lastshown == length && skip == 0) {
    page_controls = <div>
      Showing {skip+1} - {lastshown}:
        </div>;
  } else {
    page_controls = <div>
      <div>
        <UrlParameterLink update={{skip: 0}}>
        {' |< '}
        </UrlParameterLink>
        <UrlParameterLink update={{skip: prevskip}}>
        {' < '}
        </UrlParameterLink>
        <UrlParameterLink update={{skip: nextskip}}>
        {' > '}
        </UrlParameterLink>
        <UrlParameterLink update={{skip: endskip}}>
        {' >| '}
        </UrlParameterLink>
      </div>
      <br/>
      Showing {skip+1} - {lastshown} (Out of {length}):
    </div>;
  }
  return {
    skip: skip,
    page_controls: page_controls
  }
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

var _ENGLISH = 'eng';
var _MORO = 'moro';

var SearchBox = React.createClass({
  getInitialState: function() {
    return {
        search: GetVar('search', ''),
        regex: GetVar('regex', false),
        search_language: GetVar('slang', _MORO),
    };
  },
  setSearch: function(e) {
    this.setState({
      search: e.target.value
    });
  },
  setRegex: function(e) {
    var newval = false;
    if (e.target.name == 'regex') {
      newval = true;
    }
    this.setState({
      regex: newval
    });
  },
  setSearchLanguage: function(e) {
    this.setState({
      search_language: e.target.name
    });
  },
  submitSearch: function(e) {
    if (this.props.renderParameters) {
      UpdateQuery({
        'search': this.state.search,
        'regex': this.state.regex ? 1 : '',
        'search_language': this.state.search_language,
      });
    } else {
      UpdateQuery({'search': this.state.search});
    }
    if(this.props.onGo) {
      this.props.onGo();
    }
    e.preventDefault();
    return false;
  },
  renderRegex: function() {
    return (
      <div className="inline fields" style={{'display': 'inline-block',
                                             'marginLeft': '5px',
                                             'marginRight': '5px',
                                             'textAlign': 'left'}}>
      <label>Search type</label>
      <div className="field">
        <div className="ui radio checkbox">
          <input type="radio"
                 name="plain"
                 checked={!this.state.regex}
                 onChange={this.setRegex} />
          <label>Exact Match</label>
        </div>
      </div>
      <div className="field">
        <div className="ui radio checkbox">
          <input type="radio"
                 name="regex"
                 checked={this.state.regex}
                 onChange={this.setRegex} />
          <label>Contains</label>
        </div>
      </div>
    </div>
    );
  },
  renderLanguage: function() {
    return (
      <div className="inline fields" style={{'display': 'inline-block',
                                             'marginLeft': '5px',
                                             'marginRight': '5px',
                                             'textAlign': 'left'}}>
      <label>Search Language</label>
      <div className="field">
        <div className="ui radio checkbox">
          <input type="radio"
                 name={_MORO}
                 checked={this.state.search_language == _MORO}
                 onChange={this.setSearchLanguage} />
          <label>Moro</label>
        </div>
      </div>
      <div className="field">
        <div className="ui radio checkbox">
          <input type="radio"
                 name={_ENGLISH}
                 checked={this.state.search_language == _ENGLISH}
                 onChange={this.setSearchLanguage} />
          <label>English</label>
        </div>
      </div>
    </div>
    );
  },
  render: function() {
    var rendered_parameters = '';
    if (this.props.renderParameters) {
      rendered_parameters = <div style={{'display': 'inline-block'}}>
        {this.renderRegex()}
        {this.renderLanguage()}
      </div>;
    }
    return (
        <form onSubmit={this.submitSearch}>
          {rendered_parameters}
          <div className="ui icon input" style={{"display": "inline-block",
                                                 "marginRight": "5px"}}>
            <input type="text"
                   placeholder="Search..."
                   value={this.state.search}
                   onChange={this.setSearch}/>
            <i className="search icon"></i>
          </div>
          <input type="submit" value="Go"></input>
        </form>
    );
  }
});

