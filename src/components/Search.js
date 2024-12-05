import React, { useState, useEffect } from 'react';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Input from '@mui/material/Input';
import FormHelperText from '@mui/material/FormHelperText';
import axios from "axios";
import { useDispatch } from "react-redux";
import { close } from '../features/openSlice';
import { setGlobalVerse } from '../features/verseSlice.js';
import { Button } from "reactstrap";


const Search = (props) => {
  const dispatch = useDispatch();
  const [verse, setVerse] = useState(() => {
        return JSON.parse(window.localStorage.getItem("verse")) || {}
  });
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
  }

  const fetchVerses = async (searchterm) => {
      // url: "https://api.scripture.api.bible/v1/bibles/de4e12af7f28f599-01/verses/JHN.3.16?include-verse-spans=false&include-verse-numbers=false&include-chapter-numbers=false&content-type=text",
    if(searchterm !== ""){
      axios({
          url: `https://api.scripture.api.bible/v1/bibles/72f4e6dc683324df-02/search?query=${searchterm}&limit=1000&sort=relevance&range=gen.1.1-rev.22.21`,
          method: "GET",
          headers: {
              "api-key": "d3a09e9efb9856e7eac0ca40bd4b4fc3"
          }
      })
      .then((res) => {
          if(res.data.data.verses){
            setResults(res.data.data.verses)
          }
          if(res.data.data.passages){
            setResults(res.data.data.passages.map((p) => {
              return {
                id: p.id,
                text: p.content,
                bibleId: p.bibleId
              }
            }))
          }
      })
      .catch((err) => {
          console.log(err)
          setResults([])
      });
    }
  }

  const handleVerse = (verse) => {
    dispatch(setGlobalVerse(verse));
    setVerse(verse);
    dispatch(close())
  }

  useEffect(() => {
    fetchVerses(search)
  }, [search])

  useEffect(() => {
    window.localStorage.setItem("verse", JSON.stringify(verse))

  }, [verse])

  return (
  <div id="searchModal">
      <div id="searchModalHeader">
        <FormControl className="searchFieldFormControl">
            <InputLabel htmlFor="search-field">Search</InputLabel>
            <Input id="search-field" aria-describedby="search-help" value={search} onChange={handleSearchChange}/>
            <FormHelperText id="search-help">Search for a scripture</FormHelperText>
        </FormControl>
        
        <Button
          id="qsSearchBtn"
          color="primary"
          className="btn-margin"
          onClick={() => {dispatch(close())}}
        >
          X
        </Button>
      </div>
        
        <div>
          {
            results.map((result) => {
              return <div key={result.id} className="scriptureElement">
                <Button
                  color="primary"
                  className="btn-margin"
                  onClick={() => {
                    handleVerse({id: result.id, bibleId: result.bibleId, content: result.text})
                }}
                >
                choose
                </Button>
                <p>{result.text}</p>
            </div>;
            })
          }
        </div>
  </div>
  )
}

export default Search;