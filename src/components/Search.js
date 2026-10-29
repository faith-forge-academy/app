import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useDispatch } from 'react-redux';
import { close } from '../features/openSlice';
import { setGlobalVerse } from '../features/verseSlice.js';
import history from '../utils/history';
import {
  highlightParts,
  normalizeSearchResults,
  resultSummary,
  snippetAroundMatch,
} from '../utils/scriptureSearch';
import { API_BASE, API_KEY, BIBLE_COPYRIGHT, BIBLE_ID } from '../utils/bibleSource';
const RESULT_LIMIT = 20;
const SEARCH_DELAY_MS = 300;

function readStoredVerse() {
  try {
    return JSON.parse(window.localStorage.getItem('verse')) || {};
  } catch (err) {
    return {};
  }
}

function isAbort(err) {
  return err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError';
}

function HighlightedVerse({ text, query }) {
  return highlightParts(text, query).map((part, index) => (
    part.match
      ? (
        <Box
          key={index}
          component="mark"
          sx={{
            px: '2px',
            borderRadius: '2px',
            backgroundColor: '#fef08a',
            color: 'inherit',
          }}
        >
          {part.text}
        </Box>
      )
      : <React.Fragment key={index}>{part.text}</React.Fragment>
  ));
}

const Search = () => {
  const dispatch = useDispatch();
  const [verse, setVerse] = useState(readStoredVerse);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('idle');

  const handleVerse = (result) => {
    const next = {
      id: result.reference,
      bibleId: result.bibleId,
      content: result.text,
    };
    dispatch(setGlobalVerse(next));
    setVerse(next);
    dispatch(close());
    history.push('/study');
  };

  useEffect(() => {
    const term = search.trim();
    if (term.length < 2) {
      setResults([]);
      setTotal(0);
      setStatus('idle');
      return undefined;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      setStatus('loading');
      axios.get(
        `${API_BASE}/bibles/${BIBLE_ID}/search`,
        {
          params: { query: term, limit: RESULT_LIMIT, sort: 'relevance' },
          headers: { 'api-key': API_KEY },
          signal: controller.signal,
        }
      )
        .then((res) => {
          const normalized = normalizeSearchResults(res.data?.data);
          setResults(normalized.results);
          setTotal(normalized.total);
          setStatus('ready');
        })
        .catch((err) => {
          if (isAbort(err)) return;
          setResults([]);
          setTotal(0);
          setStatus('error');
        });
    }, SEARCH_DELAY_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [search]);

  useEffect(() => {
    window.localStorage.setItem('verse', JSON.stringify(verse));
  }, [verse]);

  const summary = resultSummary(results.length, total);
  let message = '';
  if (status === 'loading' && results.length === 0) message = 'Searching…';
  else if (status === 'error') message = 'Search failed. Check the connection and try again.';
  else if (status === 'ready' && results.length === 0) message = `No verses matched “${search.trim()}”.`;
  else if (search.trim().length < 2) message = 'Search a word, a phrase, or a reference like John 3:16.';

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#f7f6f3' }}>
      <Box sx={{
        px: 2,
        py: 2,
        bgcolor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}>
        <Box sx={{ maxWidth: 720, mx: 'auto', display: 'flex', gap: 1, alignItems: 'flex-start' }}>
          <TextField
            id="search-field"
            label="Search scripture"
            placeholder="love, or John 3:16"
            fullWidth
            autoFocus
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <Button
            id="closeSearchBtn"
            variant="outlined"
            onClick={() => dispatch(close())}
            sx={{ mt: 1, flexShrink: 0 }}
          >
            Close
          </Button>
        </Box>
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <Box sx={{ maxWidth: 720, mx: 'auto', px: 2, py: 2 }}>
          {summary && (
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>
              {status === 'loading' ? 'Searching…' : summary}
            </Typography>
          )}
          {message && (
            <Typography variant="body1" role={status === 'error' ? 'alert' : undefined} sx={{ color: 'text.secondary' }}>
              {message}
            </Typography>
          )}
          <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0 }}>
            {results.map((result) => (
              <Box component="li" key={result.id} sx={{ mb: 1.5 }}>
                <Box
                  component="button"
                  type="button"
                  onClick={() => handleVerse(result)}
                  sx={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    cursor: 'pointer',
                    p: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderLeftWidth: 4,
                    borderLeftColor: 'primary.main',
                    borderRadius: 2,
                    bgcolor: 'background.paper',
                    color: 'text.primary',
                    font: 'inherit',
                    '&:hover': { borderColor: 'primary.main', bgcolor: '#f8fafc' },
                    '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
                  }}
                >
                  <Typography component="span" sx={{ display: 'block', fontWeight: 700, color: 'primary.main', mb: 0.5 }}>
                    {result.reference}
                  </Typography>
                  <Typography
                    component="span"
                    sx={{
                      display: '-webkit-box',
                      WebkitLineClamp: 5,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      lineHeight: 1.5,
                    }}
                  >
                    <HighlightedVerse text={snippetAroundMatch(result.text, search)} query={search} />
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
          {(summary || results.length > 0) && (
            <Typography variant="caption" component="p" sx={{ color: 'text.secondary', mt: 2 }}>
              {BIBLE_COPYRIGHT}
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default Search;
