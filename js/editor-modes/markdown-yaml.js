/**
 * CodeMirror mode for Markdown with YAML front matter highlighting
 * Combines GFM (GitHub Flavored Markdown) with YAML for front matter sections
 */
(function(CodeMirror) {
  "use strict";

  CodeMirror.defineMode("gfm-yaml-frontmatter", function(config) {
    const yamlMode = CodeMirror.getMode(config, "yaml");
    const gfmMode = CodeMirror.getMode(config, "gfm");

    return {
      startState: function() {
        return {
          inFrontMatter: false,
          frontMatterEnded: false,
          isFirstLine: true,
          yamlState: CodeMirror.startState(yamlMode),
          gfmState: CodeMirror.startState(gfmMode)
        };
      },

      copyState: function(state) {
        return {
          inFrontMatter: state.inFrontMatter,
          frontMatterEnded: state.frontMatterEnded,
          isFirstLine: state.isFirstLine,
          yamlState: CodeMirror.copyState(yamlMode, state.yamlState),
          gfmState: CodeMirror.copyState(gfmMode, state.gfmState)
        };
      },

      token: function(stream, state) {
        // Check for opening delimiter only on the very first line
        if (stream.sol() && state.isFirstLine && !state.frontMatterEnded) {
          if (stream.match(/^---\s*$/)) {
            state.inFrontMatter = true;
            state.isFirstLine = false;
            return "meta";
          }
          state.isFirstLine = false;  // First line wasn't ---, so no front matter
        }

        // Check for closing delimiter
        if (stream.sol() && state.inFrontMatter && !state.frontMatterEnded) {
          if (stream.match(/^---\s*$/)) {
            state.inFrontMatter = false;
            state.frontMatterEnded = true;
            return "meta";
          }
        }

        // Inside front matter - use YAML mode
        if (state.inFrontMatter) {
          return yamlMode.token(stream, state.yamlState);
        }

        // Outside front matter - use GFM mode
        return gfmMode.token(stream, state.gfmState);
      },

      innerMode: function(state) {
        if (state.inFrontMatter) {
          return { state: state.yamlState, mode: yamlMode };
        }
        return { state: state.gfmState, mode: gfmMode };
      },

      blankLine: function(state) {
        // If we encounter a blank line before seeing any content,
        // front matter can no longer start
        if (state.isFirstLine) {
          state.isFirstLine = false;
        }

        if (state.inFrontMatter && yamlMode.blankLine) {
          yamlMode.blankLine(state.yamlState);
        } else if (!state.inFrontMatter && gfmMode.blankLine) {
          gfmMode.blankLine(state.gfmState);
        }
      }
    };
  });

  // Register MIME type
  CodeMirror.defineMIME("text/x-gfm-yaml", "gfm-yaml-frontmatter");
})(CodeMirror);
