      var Link = ReactRouter.Link;
      var RouteHandler = ReactRouter.RouteHandler;
      var Route = ReactRouter.Route;

      var raw_data_promise = new Promise(function(resolve, reject) {
        $.ajax({
            url: 'data.json',
            dataType: 'json',
            cache: false,
            success: function(d) {
              resolve(d);
            },
            error: function(xhr, status, err) {
              console.error('data.json', status, err.toString());
                reject(err);}

          })
      });

      function processword(word, glossword) {
        if (!word || !glossword) {
          return []
        }
        var results = [];
        var morphemes = word.split('-');
        var glosses = glossword.split('-');
        if (morphemes.length!=glosses.length) {
          return [];
        }
        var rootindex = -1;
        for (var i = 0; i < glosses.length; i++) {
          var gloss = glosses[i];
          if (_.endsWith(gloss, '.rt') || _.endsWith(gloss, '.aux')) {
            rootindex = i;
          }
        }
        for (var i = 0; i < glosses.length; i++) {
          var gloss = glosses[i];
          var morpheme = morphemes[i];
          if (rootindex==-1) {
            results.push({moroword:morpheme, definition:gloss});
          }
          else {
            if (i < rootindex) {
              gloss = gloss+'-';
              morpheme = morpheme+'-';
              results.push({moroword:morpheme, definition:gloss});
            }
            else if (i > rootindex) {
              gloss = '-'+gloss;
              morpheme = '-'+morpheme;
              results.push({moroword:morpheme, definition:gloss});
            }
            else {
              results.push({moroword:morpheme, definition:gloss});
            }
          }
        }
        return results
      }

      function processdata(dirtydata){
        var results = [];
        for (var i = 0; i < dirtydata.rows.length; i++) {
          var sentence = dirtydata.rows [i].key; 
          var presplit_morphemes = sentence.morphemes.replace(/[",.?!'()]/g, '');
          var morphemes = presplit_morphemes.split(/[ ]/);
          var gloss = sentence.gloss.split(/[ ]/);
          if (gloss.length = morphemes.length) {
            for (var ii = 0; ii < gloss.length; ii++) {
              var morpheme = morphemes[ii]; 
              var glossword = gloss[ii];
              var wordresults = processword(morpheme, glossword);
              results = results.concat(wordresults);
            }
          }

        }
        return _.sortBy (results, function(j) {
          return j.moroword;
        })
      }

      function assert(expected_value, actual) {
        if (!_.isEqual(expected_value, actual)){
          console.error('assertion failed');
          console.error(expected_value);
          console.error(JSON.stringify(expected_value));
          console.error(actual);
          console.error(JSON.stringify(actual));

        }
      }

      function test_processdata() {
        var testcase1 = {rows:[{key:{morphemes:'a', gloss:'A'}}]};
        assert([{moroword:'a', definition:'A'}], processdata(testcase1));
        var testcase2 = {rows:[{key:{morphemes:'a-b c', gloss:'A-B C'}}]};
        assert([{moroword:'a', definition:'A'}, {moroword:'b', definition:'B'}, {moroword:'c', definition:'C'}], processdata(testcase2));
       var testcase3 = {rows:[{key:{morphemes:'"loman-nǝŋ maj-anda l-a-fo,', gloss:'day-indef man-assoc.pl cll-rtc-past.aux'}}]};
        assert([{moroword:'a-', definition:'rtc-'},
                {moroword:'anda', definition:'assoc.pl'},
                {moroword:'fo', definition:'past.aux'},
                {moroword:'l-', definition:'cll-'},
                {moroword:'loman', definition:'day'}, 
                {moroword:'maj', definition:'man'},
                {moroword:'nǝŋ', definition:'indef'},
                 ], processdata(testcase3));
        var testcase4 = {rows:[{key:{morphemes:'"a,!?..', gloss:'A'}}]};
        assert([{moroword:'a', definition:'A'}], processdata(testcase4));
        var testcase5 = {rows:[{key:{morphemes:'b-a c', gloss:'B-A C'}}]};
        assert([{moroword:'a', definition:'A'}, {moroword:'b', definition:'B'}, {moroword:'c', definition:'C'}], processdata(testcase5));
      } 
      test_processdata();

      var dictionary_data_promise = raw_data_promise.then(function(rawdata) {
        return processdata(rawdata); 
      });

      var Definition = React.createClass({
        render: function() {
          return (
            <div>
              <h2>
                {this.props.moroword}
              </h2>
              {this.props.definition}
            </div>
          );
        }
      });
      var DictList = React.createClass({
        render: function() {
          var definitions=this.props.data.map(function(def) {
            return ( <Definition moroword={def['moroword']} definition={def['definition']}/> )
          });
          return (
            <div>
              {definitions}
            </div>
          );
        }
      });
      var DictBox = React.createClass({
        getInitialState: function() {
          return {data: [], loaded: false};
        },
        componentDidMount: function() {
          dictionary_data_promise.then(function(dictdata) {
                this.setState({data: dictdata, loaded: true});
              }.bind(this));
        },
        render: function() {
          if (this.state.loaded) {
            return (
             <div>
                Dictionary({this.state.data.length}): <DictList data={this.state.data.slice(0,100)}/>
              </div>
            );
          }
          return <div className="ui active dimmer">
                  <div className="ui text loader">Loading</div>
                 </div>
        }
      });
      var App = React.createClass(
        {render: function() {
          return <div className='ui container'> 
          <div className='ui secondary menu'>
            <Link className='item' to='Homepage' >Moro</Link> 
            <Link className='item' to='Dictionary' >Dictionary</Link>
          </div>
          <RouteHandler/> </div>
        }

        });
      var Homepage = React.createClass(
          {render: function() {
            return <div> Homepage </div>
          }

          }
        )
      var routes = <Route handler={App}>
        <Route path = '/' handler={Homepage} name = 'Homepage' />
        <Route path = '/dict' handler={DictBox} name = 'Dictionary'/>
        </Route>;
      ReactRouter.run(
        routes, function(Handler) {
          React.render(<Handler/>, document.getElementById('content'))

        }
        );
