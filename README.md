# Moro-database

This project contains the source code for a simple database of a collection of texts and stories in the Moro language.

The live version of the website is hosted on the [Berkeley Linguistics Site](http://linguistics.berkeley.edu/moro/).

## Features

- Viewing stories in Moro and English, optionally with gloss lines.
- Searching the corpus for a specific string.
- A concordance of Moro morphemes in the corpus.

# Design

## Constraints

- The data backing this website was enterred and storred in a [LingSync](https://www.lingsync.org/) project.
- It should be possible to easily update the data backing the website.
  - Stories were being enterred and cleaned while the website was under construction.
- Needs to be hosted on existing berkeley linguistics website infrastructure.
  - Easiest just to have all static content being served.

## Approach

- Data source:
  - LingSync uses couchDB to store it's backing data.
  - We set up a mirror on cloudant.com and add some views that clean up the data (ask @sarum90 if you need details, sorta hacky)
  - In the end there are two URLs that return live data from the LingSync project:
    - https://sande570.cloudant.com/psejenks-moro/_design/views_for_website/_view/clean_sentences
    - https://sande570.cloudant.com/psejenks-moro/_design/views_for_website/_view/clean_stories
- Data processing:
  - Concordance is constructed in JavaScript in the client browser every time they load the website.
    - This means there is no "export data" script, the site always has live data from LingSync.
    - It somewhat complicates the logic in moroScript.jsx.
    - It increases load times of the website.
      - This is usually being done in the background while people are reading the landing page.
- Data rendering:
  - Use a single-webpage design using React / ReactRouter to manage the various links.
    - All data is loaded/processed once when the page is openned, clicking just changes the view of the data.
  - Use semantic-ui to make things look prettier.

# Technical Stack

- [Semantic UI](http://semantic-ui.com/) For responsive HTML widgets / loading bars / layout / etc.
- [React](https://facebook.github.io/react/) For managing how to render the underlying data.
- [ReactRouter](https://github.com/ReactTraining/react-router/tree/v0.13.6/doc) For single paged website.
- [Lodash](https://lodash.com/) For JavaScript coding convenience.
- [jQuery](https://jquery.com/) For convenience and as a dependency of semantic.ui
- JSXTransformer - Even though you are not supposed to use for live stacks (in theory slower webpage times), we use it to simplify develpoment and deploy process.

# How to add / change the website:

The following lines need to be enterred into a terminal (Terminal application on Mac OS X).

This assumes you have [git](https://help.github.com/articles/set-up-git/) and python installed. If you do not know if you have them installed try typing `git --version` or `python --version` on the command line.

The following directions put the source code in your home directory. If you would instead like to put it in your Documents folder for example, change the first line to `cd ~/Documents`.

```bash
$ cd $HOME
$ git clone https://github.com/sande570/Moro-database.git
$ cd Moro-database/
$ python -m SimpleHTTPServer
```
If you are running python 3, you may receive an error on the last line. If so, try typing `python -m http.server` instead. 

Navigate to http://localhost:8000 in a browser. This is a version of the website running from your computer.

Use some source code text editor (Vim, Emacs, TextMate, Sublime, etc) to edit ~/Moro-database/moroScript.jsx and refresh the page to see your changes.

Make a fork and send a pull request if you have a change you want to contribute.
