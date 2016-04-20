      //Bottom of this doc sets up page structure and references components created above
      
      //Global variable for moro_click database
      var global_id_to_morpheme_definition = [];
      var global_id_to_row = {};
      var global_whole_data;
      var firstLoad = true;
      
      //These are imports from ReactRouter o.13.x
      //docs: https://github.com/rackt/react-router/blob/0.13.x/docs/guides/overview.md
      var Link = ReactRouter.Link;
      var RouteHandler = ReactRouter.RouteHandler;
      var Route = ReactRouter.Route;

      // These are endpoints to load data from.
      // Currently point to cloudant replication of lingsync data.
      // On cloudant we have a clean data view that doesn't exist on lingsync.

      // Endpoint for all up-to-date sentence data from all stories.
      var sentence_url = 'https://sande570.cloudant.com/psejenks-moro/_design/views_for_website/_view/clean_sentences';

      // Uncomment the following line for stale data, but a quick development cycle:
      // var sentence_url = 'sentences.json';

      // Endpoint mapping story id to story name
      var story_url = 'https://sande570.cloudant.com/psejenks-moro/_design/views_for_website/_view/clean_stories';

      // Uncomment the following line for stale data, but a quick development cycle:
      // var story_url = 'stories.json';

      // Promise that is resolved once the sentence data is loaded
      var raw_data_promise = new Promise(function(resolve, reject) {
        $.ajax({
            url: sentence_url,
            dataType: 'json',
            cache: false,
            success: function(d) {
              resolve(d);
            },
            error: function(xhr, status, err) {
              console.error(sentence_url, status, err.toString());
                reject(err);}

          })
      });

      // Promise that is resolved once stories are loaded
      var story_data_promise = new Promise(function(resolve, reject) {
        $.ajax({
            url: story_url,
            dataType: 'json',
            cache: false,
            success: function(d) {
              resolve(d);
            },
            error: function(xhr, status, err) {
              console.error(sentence_url, status, err.toString());
                reject(err);}

          })
      });

      //===========================================Dictionary Code===========================================

      //get id of all occurrences of the morpheme and definition pair from the global_id_to_morpheme_definition
      function get_occurrence_ids(morpheme_click, definition_click) {
        var results = [];
        for (var i = 0; i < global_id_to_morpheme_definition.length; i++) {

            var morpheme_definition_pair = global_id_to_morpheme_definition[i]["morpheme_definition"];
                
            var match_found = false;
            for (var j = 0; j < morpheme_definition_pair.length; j++) {
                if (morpheme_definition_pair[j]["moroword"] == morpheme_click && morpheme_definition_pair[j]["definition"] == definition_click) {
                    match_found = true;
                    break;
                }
            }
            if (match_found) {
                results = results.concat (global_id_to_morpheme_definition[i]["id"]);
            //{sentence_id:dirtydata.rows[i].id, utterance_match:sentence.utterance, morphemes_match:sentence.morphemes, gloss_match:sentence.gloss, translation_match:sentence.translation});
            }
            
        }
        //console.log(results);
        return results;
      }

      function get_rows(list_of_id) {
        var results = [];
        for (var i = 0; i<list_of_id.length; i++) {
          results.push(global_id_to_row[list_of_id[i]])
        }
        return results
      }


      //Segments a word into morphemes with glosses; morphemes from 'word' argument, glosses from 'glossword' argument
      function processword(word, glossword) {
        if (!word || !glossword) {
          return [[], []]
        }
        var results = [];
        var click_database_result = [];
        var morphemes = word.split('-');
        var glosses = glossword.split('-');
        //if there is not the same number of dashes we aren't aligning the correct morphemes and gloss
        if (morphemes.length!=glosses.length) {
          return [[], []];
        }
        var rootindex = -1;
        //identify verb roots so we can distinguish prefixes from suffixes
        for (var i = 0; i < glosses.length; i++) {
          var gloss = glosses[i];
          //all verb root morphemes end with .rt or .aux
          //TODO: does this include be.loc, be.1d, be.2d, etc? @HSande for details
          if (_.endsWith(gloss, '.rt') || _.endsWith(gloss, '.aux')) {
            rootindex = i;
          }
        }
        //iterate over morphemes; if there is a verb root, add pre-dashes to suffixes and post-dashes to prefixes: 
        //example: g-a-s-o; clg-rtc-eat.rt-pfv = [g-, a-, s, -o]; [clg-, rtc-, eat.rt, -pfv]
        for (var i = 0; i < glosses.length; i++) {
          var gloss = removePunc(glosses[i].toLowerCase());
          var morpheme = removePunc(morphemes[i].toLowerCase());
          if (rootindex==-1) {
            results.push({moroword:[{word:morpheme, count:1}], definition:gloss});
            click_database_result.push({moroword:morpheme, definition:gloss});
          } else {
            if (i < rootindex) { 
             gloss = gloss+'-';
              morpheme = morpheme+'-';
              results.push({moroword:[{word:morpheme, count:1}], definition:gloss});
              click_database_result.push({moroword:morpheme, definition:gloss});
            } else if (i > rootindex) {
              gloss = '-'+gloss;
              morpheme = '-'+morpheme;
              results.push({moroword:[{word:morpheme, count:1}], definition:gloss});
              click_database_result.push({moroword:morpheme, definition:gloss});
            } else {
              results.push({moroword:[{word:morpheme, count:1}], definition:gloss});
              click_database_result.push({moroword:morpheme, definition:gloss});
            }
          }
        }
        return [results, click_database_result];
      }

    //merge two arrays and de-duplicate items
    function arrayUnique(array) {
        var a = array.concat();
        for(var i=0; i<a.length; ++i) {
            for(var j=i+1; j<a.length; ++j) {
                if(a[i]["word"] === a[j]["word"]) {
                    a.splice(j--, 1);
                    a[i]["count"] += 1 
                }
            }
        }

        return a;
    }

    //remove duplicate items for click morpheme_definition_pair_list
    function arrayUniqueClick(array) {
        var a = array.concat();
        for(var i=0; i<a.length; ++i) {
            for(var j=i+1; j<a.length; ++j) {
                if(a[i]["moroword"] === a[j]["moroword"] && a[i]["definition"] === a[j]["definition"]) {
                    a.splice(j--, 1);
                }
            }
        }

        return a;
    }

    //Remove punctuation from string excluding dashes and period in word
    function removePunc(word) {
        var rtnWord = word.replace(/[,\/#?!\"\“\”$%\^&\*;:{}=_`~()]/g,"");
        rtnWord = rtnWord.replace(/\b[.]+\B|\B[.]+\b/g, "");
        return rtnWord;
    }

    //Process dict with count to sorted dict without count value
    function sortAndRemoveCount(dict) {
        var toRtn = JSON.parse(JSON.stringify(dict));
        for(var i=0; i<toRtn.length; ++i) {
            toRtn[i]["moroword"].sort(function(a, b) {
                return parseFloat(b["count"]) - parseFloat(a["count"]);
            });
            var moroWordsArray = []
            for (var j=0; j<toRtn[i]["moroword"].length; ++j) {
                delete toRtn[i]["moroword"][j]["count"]
                var word = toRtn[i]["moroword"][j]["word"]
                moroWordsArray.push(word)
            }
            toRtn[i]["moroword"] = moroWordsArray
        }
        return toRtn
    }

      function processdata(dirtydata){
        var results = [];
        for (var i = 0; i < dirtydata.rows.length; i++) {
            // split on spaces and remove punctuation from morphemes line
            var sentence = dirtydata.rows[i].value.sentence; 
            var presplit_morphemes = sentence.morphemes.replace(/[",.?!'()]/g, '');
            var morphemes = presplit_morphemes.split(/[ ]/);
            var gloss = sentence.gloss.split(/[ ]/);
            
            var morpheme_definition_pair_list = []; //store morpheme definition pair of a sentence

            if (gloss.length = morphemes.length) {
                //process all morphemes and words
                for (var ii = 0; ii < gloss.length; ii++) {
                    var morpheme = morphemes[ii]; 
                    var glossword = gloss[ii];
                    var temp = processword(morpheme, glossword);
                    var wordresults = temp[0];
                    var click_database_results = temp[1];
                    var startIndex = 0;

                    morpheme_definition_pair_list = morpheme_definition_pair_list.concat(click_database_results); //add in the morpheme definition pair

                    if (results.length == 0) {
                        results = results.concat(wordresults[startIndex]);
                        startIndex += 1;
                    }
                    for (var k = startIndex; k < wordresults.length; k++) {
                        var existed = false;
                        for (var j = 0; j < results.length; j++) {
                            if (wordresults[k]["definition"] == results[j]["definition"]) {
                                existed = true;
                                oldMoroword = results[j]["moroword"];
                                newMoroword = arrayUnique(oldMoroword.concat(wordresults[k]["moroword"]));
                                results[j]["moroword"] = newMoroword;
                                break;
                            }       
                        }
                        if (!existed) {
                           results = results.concat(wordresults[k]);
                        }
                    }
                }
                //remove duplicate pair 
                morpheme_definition_pair_list = arrayUniqueClick(morpheme_definition_pair_list);
                //add the morpheme definition pair list for each sentence into the global variable
                global_id_to_morpheme_definition.push({id:dirtydata.rows[i].id, morpheme_definition:morpheme_definition_pair_list});
                global_id_to_row[dirtydata.rows[i].id] = dirtydata.rows[i];
            }
        }
    //Print out result dict
    //console.log(JSON.stringify(results))
    //console.log(JSON.stringify(global_id_to_morpheme_definition))
    processedDict = sortAndRemoveCount(results)
    //console.log("DONE")
    //return morphemes/glosses by moro morphemes
    return _.sortBy(processedDict, function(j) {
      var moroword = _.cloneDeep(j.moroword);
      return _.map(moroword, function(x) {
        if (x[0] == '-') {
          return x.slice(1);
        }
        return x;
      });
    })
}

      // This is a test for processing code
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
        var testcase1 = {rows:[{value:{sentence:{morphemes:'a', gloss:'A'}}}]};
        assert([{moroword:['a'], definition:'a'}], processdata(testcase1));
        var testcase2 = {rows:[{value:{sentence: {morphemes:'a-b d', gloss:'A-B A'}}}]};
        assert([{moroword:['a','d'], definition:'a'}, {moroword:['b'], definition:'b'}], processdata(testcase2));
       var testcase3 = {rows:[{value:{sentence:{morphemes:'"loman-nǝŋ maj-anda l-a-fo,', gloss:'day-indef man-assoc.pl cll-rtc-past.aux'}}}]};
        assert([{moroword:['a-'], definition:'rtc-'},
                {moroword:['anda'], definition:'assoc.pl'},
                {moroword:['fo'], definition:'past.aux'},
                {moroword:['l-'], definition:'cll-'},
                {moroword:['loman'], definition:'day'}, 
                {moroword:['maj'], definition:'man'},
                {moroword:['nǝŋ'], definition:'indef'},
                 ], processdata(testcase3));
        var testcase4 = {rows:[{value:{sentence:{morphemes:'"a,!?..', gloss:'A'}}}]};
        assert([{moroword:['a'], definition:'a'}], processdata(testcase4));
        var testcase5 = {rows:[{value:{sentence:{morphemes:'b-a c', gloss:'B-A C'}}}]};
        assert([{moroword:['a'], definition:'a'}, {moroword:['b'], definition:'b'}, {moroword:['c'], definition:'c'}], processdata(testcase5));
        } 
      //test_processdata();

      // promise that resolves when sentence data is loaded and processed into morpheme dictionary
      var dictionary_data_promise = raw_data_promise.then(function(rawdata) {
        return processdata(rawdata); 
      });

      //Dictionary viewing code
      //ReactClass for rendering a definition
      var Definition = React.createClass({
        render: function() {
          var morph_def_pairs = _.map(this.props.moroword, function(morpheme) {
            return {
              morpheme: morpheme,
              definition: this.props.definition
            }
          }.bind(this));

          var rendered_morphemes = _.map(morph_def_pairs, function(pair, i) {
            var comma = ', ';
            if (i == 0) {
              comma = '';
            }
            var url = ('#/dict/concordance/' + pair.morpheme + '/' +
                       pair.definition + '?' + CurrentMetaURI().query());
            return <span key={pair.morpheme}>
              {comma}
              <a href={url}>
                {pair.morpheme}
              </a>
            </span>;
          })

          return (
            <div className="ui vertical segment">
              <h2>
                {rendered_morphemes}
              </h2>
              {this.props.definition}
            </div>
          );
        }
      });
      // ReactClass for rendering many definitions
      var DictList = React.createClass({
        render: function() {
          var definitions=this.props.data.map(function(def) {
            return ( <Definition key={def['moroword'] + ':' + def.definition}
                                 moroword={def['moroword']}
                                 definition={def['definition']}/> )
          });

          return (
            <div>
              {definitions}
            </div>
          );
        }
      });


      //SEARCH CODE

      //matchSearchFunc for definition to searchTerm (EngPlain)
      function matchSearchFuncEngPlain (searchTerm) {
        return function(element) {
          if (element.definition == searchTerm) {
            return true;
          } else {
            return false;
          }
        }
      }

      //matchSearchFunc for definition to searchTerm (EngRegex)
      function matchSearchFuncEngRegex (searchTerm) {
        return function(element) {
          var re = ".*" + searchTerm + ".*";
          if (element.definition.match(re)) {
            return true;
          } else {
            return false;
          }
        }
      }

      //matchSearchFunc for moroword to searchTerm (MoroPlain)
      function matchSearchFuncMoroPlain (searchTerm) {
        return function(element) {
          return findMoroWordInArrayMoroPlain(element.moroword, searchTerm)
        }
      }

      //matchSearchFunc healper for moroword to searchTerm (without regrex)
      function findMoroWordInArrayMoroPlain (categories, moroword) {
        var found = false;
        for (i = 0; i < categories.length && !found; i++) {
          if (categories[i] === moroword) {
            found = true;
          }
        }
        return found
      }

      //matchSearchFunc for moroword to searchTerm (MoroRegex)
      function matchSearchFuncMoroRegex (searchTerm) {
        return function(element) {
          return findMoroWordInArrayMoroRegex(element.moroword, searchTerm)
        }
      }

      //matchSearchFunc healper for moroword to searchTerm (with regrex)
      function findMoroWordInArrayMoroRegex (categories, moroword) {
        var found = false;
        for (i = 0; i < categories.length && !found; i++) {
          // if (categories[i] === moroword) {
          var re = ".*" + moroword + ".*";
          if (categories[i].match(re)) {
            found = true;
          }
        }
        return found
      }


      // React container for rendering 1 page of dictionary entries, with a
      // header and footer for page navigation.
      var DictPage = React.createClass({
        render: function() {

          if (firstLoad == true) {
            global_whole_data = this.props.data;
            firstLoad = false;
          }

          var data = this.props.data;
          var search = this.props.search;
          if (search == "") {
            data = global_whole_data;
          } else {
            var filter;

            // All blocked out for different paremeters, but currently only 
            if (this.props.search_language == 'eng') {
              if(this.props.regex) {
                filter = matchSearchFuncEngRegex;
                console.log("ENG REGEX");
              } else {
                filter = matchSearchFuncEngPlain;
                console.log("ENG PLAIN");
              }
            } else {
              if(this.props.regex) {
                filter = matchSearchFuncMoroRegex;
                console.log("MORO REGEX");
              } else {
                filter = matchSearchFuncMoroPlain;
                console.log("MORO PLAIN");
              }
            }

            data = data.filter(filter(search));
          }


          // TODO: Only show `data` that matches this search query:
          // Also, we might have to compute the alphabet on-demand here, since
          // our skips are going to be wrong.
          console.log(this.props);


          var skip = this.props.skip;
          var pagesize = this.props.limit;
          var length = data.length;

          skip = Math.max(0, Math.min(skip, length-pagesize));
          var endskip = Math.max(0, length-pagesize);
          var prevskip = Math.max(0, skip-pagesize);
          var nextskip = Math.max(0, Math.min(length-pagesize, skip+pagesize));
          var page_controls = <div>
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
            Showing {skip+1} - {skip + pagesize}:
          </div>;
          return <div>
            {page_controls}
            <DictList data={_(data).drop(skip).take(pagesize).value()} />
            {page_controls}
          </div>
        }
      });

      // React container that will show a loading dimmer until the dictionary data is available; then renders definitions
      var DictBox = React.createClass({
        getInitialState: function() {
          return {
            data: [],
            loaded: false,
          };
        },
        clearSkip : function() {
          UpdateQuery({'skip': 0});
        },
        componentDidMount: function() {
          dictionary_data_promise.then(function(dictdata) {

            // Find the first index of each letter, grouping numbers.
            var alphabet = {}
            _.forEach(dictdata, function consider_word(word, index) {
              var c = _.get(word, ["moroword", 0, 0], "");
              if (c == "-") {
                c = _.get(word, ["moroword", 0, 1], "");
              }
              c = "" + c;
              if (c.match(/[0-9]/)) {
                c = '0-9';
              }
              if (c) {
                if (alphabet[c] == undefined) {
                  alphabet[c] = index;
                }
              }
            });

            this.setState(
            {
              data: dictdata,
              alphabet: alphabet,
              loaded: true
            },
            function() {
              $(this.refs.right_half.getDOMNode()).sticky({});
            }.bind(this));
          }.bind(this));
        },
        render: function() {
          if (this.state.loaded) {
            var alphabet = this.state.alphabet;
            var alphabet_buttons = _.map(_.toPairs(alphabet), function(pair) {
              var letter = pair[0];
              var skip = pair[1];
              return <UrlParameterButton key={letter}
                        update={{skip: skip}}
                        custom_style={{
                          paddingLeft: "8px",
                          paddingRight: "8px",
                        }}>
                  {letter}
                </UrlParameterButton>;
            });

            var data = this.state.data;
            return (
             <div className='ui text container'>
               <div className="ui grid">
                  <div className="sixteen wide column">
                    <h1>
                    Concordance({data.length} total entries):
                    </h1>

                    <div className="ui grid">
                      <div className="sixteen wide column">
                          <SearchBox renderParameters={true}
                                     onGo={this.clearSkip}/>
                      </div>
                      <div className="sixteen wide column">
                          <div className="ui buttons" style={{marginBottom: "5px"}}>
                          {alphabet_buttons}
                          </div>
                      </div>
                    </div>

                  </div>
                  <div className="eight wide column">
                    <UrlParameterExtractor defaults={{skip: 0,
                                                      limit: 50,
                                                      search: '',
                                                      regex: false,
                                                      search_language: 'moro'}}>
                      <DictPage data={data} />
                    </UrlParameterExtractor>
                  </div>
                  <div className="eight wide column">
                    <div ref='right_half' className="ui sticky">
                      <RouteHandler data={data}/>
                    </div>
                  </div>
                </div>
              </div>
            );
          }
          return <div className="ui active dimmer">
                <div className="ui text loader">Loading</div>
           </div>
        }
      });

      // Dictionary view with concordance.
      var ConcordanceView = React.createClass({
        render: function() {
          var morpheme = this.props.params.morpheme 
          var definition = this.props.params.definition
          var list_of_occurrence = get_occurrence_ids(morpheme, definition);
          var list_of_four_sentences = get_rows(list_of_occurrence)
          var sentences = _.map(list_of_four_sentences, function(x) {
            return <Sentence key={x.key} sentence={x.value.sentence} show_gloss={true} />
          });
          return <div className="ui segment">
            Definition for: {this.props.params.morpheme} is {this.props.params.definition}
            <br/>
            Occurred at:<br/>
            {sentences}
          </div>
        }
      });

      var DictView = React.createClass({
        render: function() {
          return <div> </div>
        }
      });

//===================================================Text Page==================================
      // React Class that renders list of stories with links to story content pages (w/loading dimmer)
      var TextBox = React.createClass({
        getInitialState: function() {
          return {data: [], loaded: false};
       },
        componentDidMount: function() {
          story_data_promise.then(function(rawdata){
            this.setState({data: rawdata, loaded: true});
          }.bind(this))
        },
        render: function() {
          if (this.state.loaded){
            var results = this.state.data.rows.map(function (x) {
              return <li key={x.key}><Link to='Story' params={{key: x.key}}>{x.value.name}</Link></li>

            });
            return <div><ul>{results}</ul></div>;
          }
          else {
            return <div className="ui active dimmer">
                  <div className="ui text loader">Loading</div>
                 </div>
          }
        }
      });

      // A component to render a single sentence.
      var Sentence = React.createClass({
        render: function() {
          var gloss = '';
          var sentence = this.props.sentence;

          if (this.props.only_utterance) {
            return <div style={{marginBottom: "10px"}}>
              {sentence.utterance}
            </div>;
          }

          if (this.props.only_translation) {
            return <div style={{marginBottom: "10px"}}>
              {sentence.translation}
            </div>;
          }
          
          // interlinear gloss alignment
          if (this.props.show_gloss) {
            var morphemes = sentence.morphemes.split(' ');
            var glosses = sentence.gloss.split(' ');
            var pairs = _.zip(morphemes, glosses);
            // render one inline block div containing morpheme and gloss per word
            var glosses = _(pairs).map(function(x, i){
              var morpheme = x[0];
              var gloss = x[1];
              return <div style={{display: "inline-block", marginRight: "5px"}} key={i}>{morpheme}<br/>{gloss}</div>
            }.bind(this)).value();
            gloss = <span>{glosses}<br/></span>;
          }

          // render utterance and translation
          return <div style={{marginBottom: "10px"}}>
            <b>{sentence.utterance}</b><br/>
            {gloss}
            {sentence.translation}
          </div>
        }
      });

      //React Class for a single story view
      var StoryView = React.createClass({
        //React object state
        //
        //sentence: loaded flag and sentence data
        //story: loaded flag and story data
        //show_gloss: flag true if we show interlinear gloss lines
        getInitialState: function() {
          return {sentence: {data: [], loaded: false},
                  story: {data: [], loaded: false},
                  show_gloss: false,
                  story_view: false,
                  };
        },
        //queue uploading of story and sentence data when this component is mounted
        componentDidMount: function() {
          story_data_promise.then(function(rawdata){
            this.setState({story:{data: rawdata.rows, loaded: true}});
          }.bind(this));

          raw_data_promise.then(function(rawdata){
            this.setState({sentence:{data: rawdata.rows, loaded: true}});
          }.bind(this));
        },
        //only ready to display story when story and sentence data have loaded
        loaded: function() {
          return this.state.story.loaded && this.state.sentence.loaded;
        },
        //return name of story by searching story data for this story's id
        getStory: function() {
          var arr = this.state.story.data;
          for (var i = 0; i < arr.length; i++) {
            var o = arr[i];
            if (o.key == this.props.params.key) {
              return  o.value.name;
            }
          }
          return "<Unknown Story>";
        },
        //toggles interlinear gloss or not
        toggleGloss: function() {
          var new_show_gloss = !this.state.show_gloss;
          var new_story_view = this.state.story_view;
          if(new_show_gloss) {
            new_story_view = false;
          }
          this.setState({show_gloss: new_show_gloss,
                         story_view: new_story_view});
        },
        //toggles story view
        toggleStoryView: function() {
          var new_show_gloss = this.state.show_gloss;
          var new_story_view = !this.state.story_view;
          if(new_story_view) {
            new_show_gloss = false;
          }
          this.setState({show_gloss: new_show_gloss,
                         story_view: new_story_view});
        },
        //renders component
        render: function() {
          // If we haven't loaded yet, just render the dimmer.
          if (!this.loaded()) {
            return <div className="ui active dimmer">
              <div className="ui text loader">Loading</div>
            </div>;
          }
          // process sentence data to render alignment of morphemes/glosses and show one clause per line
          // lodash chaining: https://lodash.com/docs#_
          var sentences;
          var story_sentences = _(this.state.sentence.data).filter(
            // render sentences from this story
            function(x){
              return x.value.story == this.props.params.key;
            }.bind(this)
          );
          if (this.state.story_view) {
            var sentence_rows = story_sentences.map(
              function(x) {
                  return [
                    (
                      <div key={x.key + "-1"} className="eight wide column"
                           style={{"padding": "0px"}}>
                        <Sentence sentence={x.value.sentence}
                                  only_utterance="true" />
                      </div>
                    ),
                    (
                      <div key={x.key + "-2"} className="eight wide column"
                           style={{"padding": "0px"}}>
                        <Sentence sentence={x.value.sentence}
                                  only_translation="true" />
                      </div>
                    )
                  ];
              }.bind(this)
            ).value();

            sentences = (
             <div className='ui text container'
                  style={{"padding-top": "14px"}}>
               <div className="ui grid">
                {sentence_rows}
               </div>
             </div>
            );
          } else {
            sentences = story_sentences.map(
              // how to render a sentence
              function(x){
                return <Sentence key={x.key}
                          sentence={x.value.sentence}
                          show_gloss={this.state.show_gloss}/>;
              }.bind(this)
            ).value();
          }
          // render story content page with title and checkbox to toggle interlinear gloss display
          return (
            <div>
              <h1>{this.getStory()}</h1>
              <div className="ui form">

                <div className="grouped fields">
                  <label>View Options</label>

                  <div className="field">
                    <div className="ui slider checkbox">
                      <input type="radio" name="throughput" checked={this.state.show_gloss} onChange={this.toggleGloss}> </input>
                      <label>Show Glosses</label>
                    </div>
                  </div>

                  <div className="field">
                    <div className="ui slider checkbox">
                      <input type="radio" name="throughput" checked={this.state.story_view} onChange={this.toggleStoryView}> </input>
                      <label>Story View</label>
                    </div>
                  </div>

                </div>
              </div>
              {sentences}
            </div>
          );

        }
      });

      var Homepage = React.createClass(
             
         {render: function() {
//=========================HOMEPAGE===============================
          return   <div className='ui text container'> 

				
          		<h1 className='ui dividing header'>Moro Language Stories</h1>

              <img className="ui medium right floated rounded image" src="./images/Nuba-berge.jpg"></img>
          
          <p>This website contains a collection of texts and stories in the Moro language. The Moro language was born in the Nuba Mountains of Sudan, where most of its speakers still live. Today Moro is also spoken in Khartoum, Sudan, and by Moro people living around the world. Through the stories on this page you can learn more about the Moro, their culture, and their traditional stories. </p> 

          
           <p>This page is also intended as a language resource for Moro people and researchers who are interested in learning more about the Moro language. The stories are a mixture of dialects, but often closely resemble the Wërria dialect, the same dialect in which the New Testament was written. As in all written Moro, tone is not marked in these stories. </p>
            
         	<h1 className='ui dividing header'>Project members</h1>


			<h3> Angelo Naser (Author, Editor) </h3>
        	<p> Born and raised in the Nuba Mountains, Angelo now works at the United Bible Society in Khartoum. </p> 

			<h3> Peter Jenks (Editor) </h3>
        	<p> Peter has studied the Moro language since 2005. He is an Assistant Professor at UC Berkeley</p> 

			<h3> Hannah Sande (Editor) </h3>
        	<p> Hannah is a graduate student in the UC Berkeley linguistics department. In addition to her work on Moro, Hannah has worked extensively on Guebie, an endangered Kru language spoken in the Ivory Coast. </p> 

			<h3> Marcus Ewert </h3>
        	<p> Marcus has helped linguists develop software for documentation. He works as a developer in the Bay Area.</p> 

			<h3> Juwon Kim </h3>
        	<p> UC Berkeley Class of 2018, Juwon is a double major in linguistics and computer science. </p> 

			<h3> Maytas Monsereenusorn </h3>
        	<p> UC Berkeley Class of 2016, Maytas is a double major in economics and computer science. </p> 

          </div>
          }
         }
      )

//=========================Search Page===============================
      var SearchPane = React.createClass({
        render: function() {
          return (
            <div>
              <h1> </h1>
              <center>
                <SearchBox />
              </center>
              <div>
                Results <br/>
                Sentences here that match {this.props.search}.
              </div>
            </div>
          );
        }
      });

      var SearchPage = React.createClass({
        render: function() {
          return (
            <UrlParameterExtractor defaults={{search: ''}}>
              <SearchPane />
            </UrlParameterExtractor>
          );
        }
      });

      //render page template using ReactRouter: https://github.com/rackt/react-router/blob/0.13.x/docs/guides/overview.md
      var App = React.createClass(
        {render: function() {
          return <div className='ui main text container'> 
          <div className='ui borderless main menu fixed' styleName='position: fixed; top: 0px; left: auto; z-index: 1;'>
              <div className='ui text container'>
                <Link className='item' to='Homepage' >About</Link> 
                <Link className='item' to='Texts' >Texts</Link>
                <Link className='item' to='Dictionary' >Concordance</Link>
                <Link className='item' to='Search' >Search</Link>
        		</div>
          </div>
           		<div className='ui borderless secondary menu' styleName='position: fixed; top: 0px; left: auto; z-index: 1;'>
          			<div className='ui text container'>
            			<Link className='item' to='Homepage' >About</Link> 
            			<Link className='item' to='Texts' >Texts</Link>
            			<Link className='item' to='Dictionary' >Concordance</Link>
        			</div>
          		</div>
		 <RouteHandler/> </div>
        }
        });


      // set up routes for ReactRouter: https://github.com/rackt/react-router/blob/0.13.x/docs/guides/overview.md
      // enables the single-page web app design
      var routes = <Route handler={App}>
        <Route path = '/' handler={Homepage} name='Homepage' />
        <Route path = '/dict' handler={DictBox} name='Dictionary'>
          <Route path = '/dict'
                 handler={DictView} name='Dict' />
          <Route path = '/dict/concordance/:morpheme/:definition'
                 handler={ConcordanceView} name='Concordance' />
        </Route>
        <Route path = '/text' handler={TextBox} name='Texts' />
        <Route path = '/text/story/:key' handler={StoryView} name='Story' />
        <Route path = '/search' handler={SearchPage} name='Search' />
      </Route>;
      ReactRouter.run(
        routes, function(Handler) {
          React.render(<Handler/>, document.getElementById('content'))

        }
        );
