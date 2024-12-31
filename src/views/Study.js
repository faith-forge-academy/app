import React from "react";

import { useState, useEffect } from "react"

import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useSelector, useDispatch } from "react-redux";
import {setGlobalPhrase} from '../features/phraseSlice.js';
import { Mic, MicOff, Check } from "lucide-react"

// Mock scripture data (replace with actual data in a real application)
const scripture = {
  reference: "John 3:16",
  text: "For God so loved the world, that he gave his one and only Son that whoever believes in him shall not perish but have eternal life.",
  replacedText: "",
  splitText: []
}

// Simple word-by-word comparison function
function compareWords(original, spoken) {
    const originalWords = original.split(/\s+/)
    const spokenWords = spoken.toLowerCase().split(/\s+/)
    
    return originalWords.map((word, index) => ({
        correct: index < spokenWords.length && stripPunctuation(word) === stripPunctuation(spokenWords[index]),
        word: word
    }))
}

function stripPunctuation(str){
    str = str.replaceAll(/[.,/#!$%^&*;:{}=\-_`~()]/gu, '').toLowerCase()
    
    return str
}

function CustomTabPanel(props) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`simple-tabpanel-${index}`}
            aria-labelledby={`simple-tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
        </div>
  );
}

function a11yProps(index) {
    return {
        id: `simple-tab-${index}`,
        'aria-controls': `simple-tabpanel-${index}`,
    };
}

/**
 * This function takes a string of scripture text and splits it on a space.
 * It then loops through each word creating an object:
 *      If the "word" ends with punctuation, increment the phrase counter and add phrase to the object
 *      Add an index to the object
 *      Initialize "said" and "correct" both to boolean false
 *      add the word to a "word" property
 * 
 * @param {string} scriptureText
 * 
 * returns an array of word objects 
 */
function createWordsCollection(scriptureText) {
    let scriptureSimpleWordArray = scriptureText.split(/\s+/);
    let scriptureWordsCollection = [];
    let currentWord;
    let currentWordObject;
    let currentPhrase = 1;

    for (let i=0; i < scriptureSimpleWordArray.length; i++) {
        currentWord = scriptureSimpleWordArray[i];
        currentWordObject = {};

        currentWordObject.idx = i;
        currentWordObject.word = currentWord;
        currentWordObject.said = false;
        currentWordObject.correct = null;

        currentWordObject.phrase = currentPhrase;
        
        if (currentWord.match(/[.,/#!$%^&*;:{}=\-_`~()]/gu)) {
            currentPhrase++
        }

        scriptureWordsCollection.push(currentWordObject)
    }

    return scriptureWordsCollection;
}

export default function Study() {
    const dispatch = useDispatch();
    const {
        finalTranscript,
        listening,
        resetTranscript,
    } = useSpeechRecognition();
  
    const v = useSelector((state) => { return state.verse});
  
    if (v !== {} && v.id !== undefined && v.content !== undefined){
        scripture.reference = v.id;
        scripture.text = v.content;
    } else if (window.localStorage.getItem("verse")){
        const v = JSON.parse(window.localStorage.getItem("verse"))
        scripture.reference = v.id;
        scripture.text = v.content;
    }

    scripture.replacedText = stripPunctuation(scripture.text)
    scripture.splitText = scripture.replacedText.split(/\s+/)
    const [activeTab, setActiveTab] = useState(0)
    const [spokenText, setSpokenText] = useState("")
    let [currentWordIndex, setCurrentWordIndex] = useState(0)
    let [wordCounter, setWordCounter] = useState(0)
    const [testSubmission, setTestSubmission] = useState("")
    const [testResult, setTestResult] = useState([])
    let [phraseIndex, setPhraseIndex] = useState(useSelector((state) => {return state.phrase}));
    let scriptureWordCollection = createWordsCollection(scripture.text);
    let phraseCount = scriptureWordCollection[scriptureWordCollection.length - 1].phrase;
    let phraseNums = [];

    for (let i = 1; i <= phraseCount; i++) {
      phraseNums.push(i);
    }

    useEffect(() => {

        // If we are on the practice tab
        if (activeTab === 1) {
            console.log("spokenText:", spokenText)
            
            let transSplits = []
            let increase = 0
            let nextPhrase = 1;

            if(spokenText !== ""){
                transSplits = spokenText.trim().split(/\s+/)
            }

            for (let i in transSplits) {
              
                const curr = transSplits[i].toLowerCase() //transSplits should just be a phrase or a subset of the overall array
                const currentWord = scripture.splitText[wordCounter].toLowerCase(); // this is an array of all words in the passage
                
                let nextI = wordCounter + 1;
                let nextWord = scriptureWordCollection[`${nextI}`];

                if (typeof nextWord != 'undefined') {
                  nextPhrase = nextWord.phrase;
                }

                console.log(curr, currentWord, wordCounter, curr === currentWord)
                
                if (curr === currentWord){
                    scriptureWordCollection[wordCounter].said = true;

                    dispatch(setGlobalPhrase(nextPhrase));
                    setPhraseIndex(nextPhrase);

                    increase++

                    setCurrentWordIndex(currentWordIndex + parseInt(i));
                    setWordCounter(wordCounter++);
                } else {
                    // need to display something more useful to the user
                    console.log("hmmm...")
                    break
                }

                // increment again for the last word in the sub-array...
                if (parseInt(i) === transSplits.length - 1) {
                  setWordCounter(wordCounter++);
                }
            }

            if(increase !== 0){
                setSpokenText("")
                resetTranscript();
            } else {
                resetTranscript();
            }

        } else if (activeTab === 2) {
            // Only update for final results in test mode
            setTestSubmission(spokenText)
        }
  }, [activeTab, spokenText, currentWordIndex, resetTranscript, dispatch, scriptureWordCollection, wordCounter])

  /**
   * This useEffect watches for when the active tab changes value and resets
   * spoken text, test result, and test submission
   */
  useEffect(() => {
    setSpokenText("")
    setTestResult([])
    setTestSubmission("")
  }, [activeTab])

  /**
   * This useEffect watches for a change in the finalTranscript variable and
   * sets the spokenText state to the final transcript value
   */
  useEffect(() => {
    setSpokenText(finalTranscript)
  }, [finalTranscript])

  const toggleListening = () => {
    if (listening) {
      console.log("toggleListening: true")
      SpeechRecognition.stopListening()
    } else {
      console.log("toggleListening: false")
      SpeechRecognition.startListening({continuous: true})
    }
  }

  const handleTestSubmit = () => {
    setTestResult(compareWords(scripture.text, testSubmission))
  }

  const handleTabChange = (e, newValue) => {
    setActiveTab(newValue);
  }

  function getPhrase(phraseIndex) {
    const requestedPhrase = scriptureWordCollection.map((wordObj) =>
      wordObj.phrase == phraseIndex ? <span
        key={wordObj.idx}
        style={{
          color: (wordObj.said) ? '#00DD00' : '#CCCCCC',
          paddingRight: '4px'
        }}
      >
        {wordObj.word}
      </span> : ""
    );

    return requestedPhrase;
  }
  
  return (
    <>
        <Tabs value={activeTab} onChange={handleTabChange}>
            <Tab label="Read" {...a11yProps(0)} />
            <Tab label="Practice" {...a11yProps(1)} />
            <Tab label="Test" {...a11yProps(2)} />
        </Tabs>
    <Card className="w-full max-w-3xl mx-auto">
      <CardContent>
          <CustomTabPanel value={activeTab} index={0}> 
              <p>{scripture.text}</p>
              <p>{scripture.reference}</p>
          </CustomTabPanel>
          <CustomTabPanel value={activeTab} index={1}>
              <h1>Word-by-Word Practice</h1>
              <p>Practice the scripture word by word</p>
              <div className="space-y-4">
                <div className="text-center text-2xl font-bold p-4 border rounded">
                  {
                    phraseNums.map((phraseNum) => 
                      phraseNum <= phraseIndex ?
                      <div>
                        {getPhrase(phraseNum)}
                      </div> : ""
                    )
                  }
                </div>
                <Button onClick={toggleListening} variant="outline" className="w-full">
                  {listening ? <MicOff className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
                  {listening ? "Stop" : "Start"} Listening
                </Button>
              </div>
          </CustomTabPanel>
          <CustomTabPanel value={activeTab} index={2}>
              <h1>Memorization Test</h1>
              <p>Type or speak the scripture from memory and check your accuracy</p>
              <div className="space-y-4">
              <Typography>
                    {testResult.map((result, index) => (
                      <span
                        key={index}
                        className={`inline-block mr-1 ${
                          result.correct ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {result.word}
                      </span>
                    ))}
              </Typography>
              <textarea id="scriptureInput" placeholder="type the scripture here..." className="min-h-[100px]"
                onChange={(e) => {setTestSubmission(e.target.value)}} value={testSubmission} ></textarea>
                <div className="flex justify-between">
                  <Button onClick={toggleListening} variant="outline">
                    {listening ? <MicOff className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
                    {listening ? "Stop" : "Start"} Listening
                  </Button>
                  <Button onClick={handleTestSubmit}>
                    <Check className="mr-2 h-4 w-4" />
                    Check Answer
                  </Button>
                </div>
              </div>
          </CustomTabPanel>
      </CardContent>
      <CardActions className="flex justify-between">
        <Button variant="outline" onClick={() => setActiveTab(0)}>Back to Reading</Button>
        <Button onClick={() => setActiveTab(activeTab === 0 ? 1 : activeTab === 1 ? 2 : 0)}>
          Next Mode
        </Button>
      </CardActions>
    </Card>
    </>
  );
}
