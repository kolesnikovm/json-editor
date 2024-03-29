import React from 'react'
import { makeStyles } from '@material-ui/core/styles'
import AppBar from '@material-ui/core/AppBar'
import Toolbar from '@material-ui/core/Toolbar'
import Typography from '@material-ui/core/Typography'
import Button from '@material-ui/core/Button'
import Grid from '@material-ui/core/Grid'
import ButtonGroup from '@material-ui/core/ButtonGroup'
import FormControlLabel from '@material-ui/core/FormControlLabel'
import Switch from '@material-ui/core/Switch'
import MenuItem from '@material-ui/core/MenuItem'
import Select from '@material-ui/core/Select'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faIndent, faAlignJustify } from '@fortawesome/free-solid-svg-icons'


const DiffMatchPatch = require("diff-match-patch")
const dmp = new DiffMatchPatch()

const ace = require('ace-builds/src-noconflict/ace')
const Range = ace.require("ace/range").Range
require("ace-builds/webpack-resolver")

var format = require('xml-formatter')
var stringify = require('json-stable-stringify')
const minifyXML = require("minify-xml").minify;
var underscore = require('underscore');

const languages = [
  "json",
  "xml",
]

const useStyles = makeStyles((theme) => ({
  root: {
    height: 'calc(100% - 100px);',
    width: '100%',
    position: 'fixed',
    border: '1px solid lightgray',
  },
  button: {
    color: 'white',
  },
  buttonGroup: {
    marginLeft: theme.spacing(4),
    height: '36px',
  },
  toolbar: {
    padding: 0,
  },
  footer: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#e8e8e8',
    height: theme.spacing(3),
    lineHeight: '24px',
  },
  switch: {
    float: 'right',
  },
  footerText: {
    fontSize: '10pt',
    color: 'grey',
    margin: theme.spacing(0, 1),
  },
  footerNum: {
    fontSize: '10pt',
    color: 'grey',
    margin: theme.spacing(0, 1, 0, 0),
  },
  selector: {
    float: 'right',
    color: 'white',
    margin: '3px 16px 0 0',
  }
}))


export default function App() {
  const classes = useStyles()

  const split = React.useRef({})

  const [cursor1, setCursor1] = React.useState({ row: 0, column: 0 })
  const [cursor2, setCursor2] = React.useState({ row: 0, column: 0 })

  const [diffMode, setDiffMode] = React.useState(window.localStorage.getItem('diffMode') === 'true')
  const [mode, setMode] = React.useState(window.localStorage.getItem('mode'))

  const refContainer = React.useRef()

  React.useEffect(() => {
    const node = refContainer.current
    var Split = require("ace-builds/src-noconflict/ext-split").Split
    split.current = new Split(node, "ace/theme/xcode", 2)


    var editorL = split.current.getEditor(0)
    var dataL = window.localStorage.getItem(editorL.id)
    if (dataL !== null) {
      let session = sessionFromJSON(JSON.parse(dataL))
      editorL.setSession(session)
    } else {
      editorL.session.setMode("ace/mode/json");
      editorL.session.setUndoManager(new ace.UndoManager())
    }
    editorL.setShowPrintMargin(false)

    var editorR = split.current.getEditor(1)
    var dataR = window.localStorage.getItem(editorR.id)
    if (dataR !== null) {
      let session = sessionFromJSON(JSON.parse(dataR))
      editorR.setSession(session)
    } else {
      editorR.session.setMode("ace/mode/json")
      editorR.session.setUndoManager(new ace.UndoManager())
    }
    editorR.setShowPrintMargin(false)


    function handleResize() {
      split.current.resize()
    }

    window.addEventListener('resize', handleResize)
    handleResize()


    editorL.selection.on("changeCursor", function() {
      setCursor1(editorL.getCursorPosition())
    })

    editorR.selection.on("changeCursor", function() {
      setCursor2(editorR.getCursorPosition())
    })


    editorL.on('change', (changes) => {
      window.localStorage.setItem(editorL.id, JSON.stringify(sessionToJSON(editorL.getSession())))
    })
    editorR.on('change', (changes) => {
      window.localStorage.setItem(editorR.id, JSON.stringify(sessionToJSON(editorR.getSession())))
    })
  }, [])

React.useEffect(() => {
  split.current.getEditor(0).session.setMode("ace/mode/"+mode)
  split.current.getEditor(1).session.setMode("ace/mode/"+mode)

  window.localStorage.setItem('mode', mode)
}, [mode])

  const sessionToJSON = (session) => {
    return {
        value: session.getValue(),
        history: {
            undo: session.$undoManager.$undoStack,
            redo: session.$undoManager.$redoStack
        },
        scrollTop: session.getScrollTop(),
        scrollLeft: session.getScrollLeft(),
        options: session.getOptions()
    }
}

const sessionFromJSON = (data) => {
  var session = ace.createEditSession(data.value)
  session.$undoManager.$doc = session // workaround for a bug in ace
  session.setOptions(data.options)
  session.$undoManager.$undoStack = data.history.undo
  session.$undoManager.$redoStack = data.history.redo
  session.setScrollTop(data.scrollTop)
  session.setScrollLeft(data.scrollLeft)
  return session
}

const handleDiff = React.useCallback(
  () => {
    var editorL = split.current.getEditor(0)
    var editorR = split.current.getEditor(1)

    var diff = dmp.diff_main(editorL.getValue(), editorR.getValue())
    dmp.diff_cleanupSemantic(diff);
    const diffedLines = generateDiffedLines(diff)
    const codeEditorSettings = setCodeMarkers(diffedLines)

    handleMarkers(codeEditorSettings[0], editorL)
    handleMarkers(codeEditorSettings[1], editorR)
  }, [],
);

  React.useEffect(() => {
    window.localStorage.setItem('diffMode', diffMode)

    var editorL = split.current.getEditor(0)
    var editorR = split.current.getEditor(1)

    if (diffMode) {
      var diff = dmp.diff_main(editorL.getValue(), editorR.getValue())
      dmp.diff_cleanupSemantic(diff);
      const diffedLines = generateDiffedLines(diff)
      const codeEditorSettings = setCodeMarkers(diffedLines)

      handleMarkers(codeEditorSettings[0], editorL)
      handleMarkers(codeEditorSettings[1], editorR)

      editorL.session.on("change", handleDiff)
      editorR.session.on("change", handleDiff)
    } else {
      let currentMarkers = editorL.session.getMarkers(false);
      for (const i in currentMarkers) {
        if (currentMarkers.hasOwnProperty(i) && currentMarkers[i].type !== "screenLine") {
          editorL.session.removeMarker(currentMarkers[i].id);
        }
      }

      currentMarkers = editorR.session.getMarkers(false);
      for (const i in currentMarkers) {
        if (currentMarkers.hasOwnProperty(i) && currentMarkers[i].type !== "screenLine") {
          editorR.session.removeMarker(currentMarkers[i].id);
        }
      }

      editorL.session.off('change', handleDiff)
      editorR.session.off('change', handleDiff)
    }
  }, [diffMode, handleDiff])

  const handleFormat = (id) => () => {
    var editor = split.current.getEditor(id)
    var value = editor.getValue()
    var formattedValue

    switch (mode) {
      case 'json':
        try {
          formattedValue = JSON.stringify(JSON.parse(value), null, 2)
        } catch (error) {
          console.log('Can\'t escape json')
          return
        }
        break
      case 'xml':
        try {
          formattedValue = format(value, {
            collapseContent: true, 
          })
        } catch (error) {
          console.log('Can\'t parse xml')
          return
        }
        break
      default:
        console.log('Wrong mode' + mode)
        return
    }

    editor.setValue(formattedValue)
    editor.selection.clearSelection()
  }

  const handleMinify = (id) => () => {
    var editor = split.current.getEditor(id)
    var value = editor.getValue()
    var minifiedValue

    switch (mode) {
      case 'json':
        try {
          value = JSON.parse(value)
        } catch (error) {
          console.log('Can\'t escape json')
          return
        }
        minifiedValue = JSON.stringify(value, null, 0)
        break
    case 'xml':
        try {
          minifiedValue = minifyXML(value)
        } catch (error) {
          console.log('Can\'t parse xml')
          return
        }
        break
      default:
        console.log('Wrong mode' + mode)
        return
    }

    editor.setValue(minifiedValue)
    editor.selection.clearSelection()
  }

  const handleEscape = (id) => () => {
    var editor = split.current.getEditor(id)
    var escapedValue
    

    switch (mode) {
      case 'json':
        var jsonValue = editor.getValue().replace(/^(\r?\n)+|(\r?\n)+$/g, '')
        try {
          JSON.parse(jsonValue)
        } catch (error) {
          console.log('Can\'t escape json')
          return
        }
        escapedValue = JSON.stringify(jsonValue)
        escapedValue = escapedValue.substring(1, escapedValue.length - 1)
        break
      case 'xml':
        var xmlValue = editor.getValue()
        try {
          escapedValue = underscore.escape(xmlValue)
        } catch (error) {
          console.log('Can\'t escape xml')
          return
        }
        break
      default:
        console.log('Wrong mode' + mode)
        return
    }

    editor.setValue(escapedValue)
    editor.selection.clearSelection()
  } 

  const handleUnescape = (id) => () => {
    var editor = split.current.getEditor(id)
    var unescapedValue

    switch (mode) {
      case 'json':
        var stringValue = '"' + editor.getValue().replace(/^(\r?\n)+|(\r?\n)+$/g, '') + '"'
        console.log(stringValue)
        try {
          unescapedValue = JSON.parse(JSON.parse(stringValue))
        } catch (error) {
          console.log('Can\'t unescape json')
          return
        }
        unescapedValue = JSON.stringify(unescapedValue)
        break
      case 'xml':
        var xmlValue = editor.getValue()
        try {
          unescapedValue = underscore.unescape(xmlValue)
        } catch (error) {
          console.log('Can\'t unescape xml')
          return
        }
        break
      default:
        console.log('Wrong mode' + mode)
        return
    }

    editor.setValue(unescapedValue)
    editor.selection.clearSelection()
  }

  const handleDiffMode = () => {
    console.log(split.current.getEditor(0).session.getUndoManager())

    setDiffMode(!diffMode)
  }

  const handleSort = (id) => () => {
    var editor = split.current.getEditor(id)
    var jsonValue = editor.getValue()

    try {
      jsonValue = JSON.parse(jsonValue)
    } catch (error) {
      console.log('Can\'t sort json')
      return
    }

    var stringValue = stringify(jsonValue, {space: 2})

    editor.setValue(stringValue)
    editor.selection.clearSelection()
  }

  const clearCache = () => () => {
    console.log("Clear cache")
    window.localStorage.clear()
  }
 
  return (
    <div>
      <AppBar position="static">
        <Toolbar variant="dense" className={classes.toolbar}>
          <Grid container spacing={0}>
            <Grid item xs={12}>
              <Button className={classes.button} onClick={clearCache()}>Clear Cache</Button>
              <FormControlLabel
                control={<Switch checked={diffMode} onChange={handleDiffMode} />}
                label="Diff mode"
                className={classes.switch}
              />
              <Select
                className={classes.selector}
                value={mode}
                onChange={event => setMode(event.target.value)}
              >
                {languages.map(language => (
                  <MenuItem value={language}>{language}</MenuItem>
                ))}
              </Select>
            </Grid>
            <Grid item xs={6}>
              <ButtonGroup variant="text" className={classes.buttonGroup}>
                <Button className={classes.button} onClick={handleFormat(0)}><FontAwesomeIcon icon={faIndent} size='lg' /></Button>
                <Button className={classes.button} onClick={handleMinify(0)}><FontAwesomeIcon icon={faAlignJustify} size='lg' /></Button>
                <Button className={classes.button} onClick={handleEscape(0)}>escape</Button>
                <Button className={classes.button} onClick={handleUnescape(0)}>unescape</Button>
                {mode === 'json' && <Button className={classes.button} onClick={handleSort(0)}>sort</Button>}
              </ButtonGroup>
            </Grid>
            <Grid item xs={6}>
              <ButtonGroup variant="text" className={classes.buttonGroup}>
                <Button className={classes.button} onClick={handleFormat(1)}><FontAwesomeIcon icon={faIndent} size='lg' /></Button>
                <Button className={classes.button} onClick={handleMinify(1)}><FontAwesomeIcon icon={faAlignJustify} size='lg' /></Button>
                <Button className={classes.button} onClick={handleEscape(1)}>escape</Button>
                <Button className={classes.button} onClick={handleUnescape(1)}>unescape</Button>
                {mode === 'json' && <Button className={classes.button} onClick={handleSort(1)}>sort</Button>}
              </ButtonGroup>
            </Grid>
          </Grid>
        </Toolbar>
      </AppBar>
      <div ref={refContainer} className={classes.root}></div>
      <div className={classes.footer}>
        <Grid container spacing={0}>
          <Grid item xs={6}>
            <Typography className={classes.footerText} display='inline'>Ln:</Typography>
            <Typography className={classes.footerNum} display='inline'>{cursor1.row + 1}</Typography>
            <Typography className={classes.footerText} display='inline'>Col:</Typography>
            <Typography className={classes.footerNum} display='inline'>{cursor1.column + 1}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography className={classes.footerText} display='inline'>Ln:</Typography>
            <Typography className={classes.footerNum} display='inline'>{cursor2.row + 1}</Typography>
            <Typography className={classes.footerText} display='inline'>Col:</Typography>
            <Typography className={classes.footerNum} display='inline'>{cursor2.column + 1}</Typography>
          </Grid>
        </Grid>
      </div>
    </div>
  );
}

function generateDiffedLines(diff) {
  const C = {
    DIFF_EQUAL: 0,
    DIFF_DELETE: -1,
    DIFF_INSERT: 1
  };

  const diffedLines = {
    left: [],
    right: []
  };

  const cursor = {
    left: 1,
    right: 1
  };

  diff.forEach((chunk) => {
    const chunkType = chunk[0];
    const text = chunk[1];
    let lines = text.split("\n").length - 1;

    // diff-match-patch sometimes returns empty strings at random
    if (text.length === 0) {
      return;
    }

    const firstChar = text[0];
    const lastChar = text[text.length - 1];
    let linesToHighlight = 0;

    switch (chunkType) {
      case C.DIFF_EQUAL:
        cursor.left += lines;
        cursor.right += lines;

        break;
      case C.DIFF_DELETE:
        // If the deletion starts with a newline, push the cursor down to that line
        if (firstChar === "\n") {
          cursor.left++;
          lines--;
        }

        linesToHighlight = lines;

        // If the deletion does not include a newline, highlight the same line on the right
        if (linesToHighlight === 0) {
          diffedLines.right.push({
            startLine: cursor.right,
            endLine: cursor.right
          });
        }

        // If the last character is a newline, we don't want to highlight that line
        if (lastChar === "\n") {
          linesToHighlight -= 1;
        }

        diffedLines.left.push({
          startLine: cursor.left,
          endLine: cursor.left + linesToHighlight
        });

        cursor.left += lines;
        break;
      case C.DIFF_INSERT:
        // If the insertion starts with a newline, push the cursor down to that line
        if (firstChar === "\n") {
          cursor.right++;
          lines--;
        }

        linesToHighlight = lines;

        // If the insertion does not include a newline, highlight the same line on the left
        if (linesToHighlight === 0) {
          diffedLines.left.push({
            startLine: cursor.left,
            endLine: cursor.left
          });
        }

        // If the last character is a newline, we don't want to highlight that line
        if (lastChar === "\n") {
          linesToHighlight -= 1;
        }

        diffedLines.right.push({
          startLine: cursor.right,
          endLine: cursor.right + linesToHighlight
        });

        cursor.right += lines;
        break;
      default:
        throw new Error("Diff type was not defined.");
    }
  });
  return diffedLines;
}

function setCodeMarkers(diffedLines) {
  const codeEditorSettings = [];

  const newMarkerSet = {
    left: [],
    right: []
  };

  for (let i = 0; i < diffedLines.left.length; i++) {
    const markerObj = {
      startRow: diffedLines.left[i].startLine - 1,
      endRow: diffedLines.left[i].endLine,
    };
    newMarkerSet.left.push(markerObj);
  }

  for (let i = 0; i < diffedLines.right.length; i++) {
    const markerObj = {
      startRow: diffedLines.right[i].startLine - 1,
      endRow: diffedLines.right[i].endLine,
    };
    newMarkerSet.right.push(markerObj);
  }

  codeEditorSettings[0] = newMarkerSet.left;
  codeEditorSettings[1] = newMarkerSet.right;

  return codeEditorSettings;
}

function handleMarkers(markers, editor) {
  // remove foreground markers
  let currentMarkers = editor.session.getMarkers(false);
  for (const i in currentMarkers) {
    if (currentMarkers.hasOwnProperty(i) && currentMarkers[i].type !== "screenLine") {
      editor.session.removeMarker(currentMarkers[i].id);
    }
  }
  // add new markers
  markers.forEach(
    ({
      startRow,
      startCol = 0,
      endRow,
      endCol = 0,
      type = "text",
      className = "diffMarker",
    }) => {
      const range = new Range(startRow, startCol, endRow, endCol)
      editor.session.addMarker(range, className, type)
    }
  )
}
