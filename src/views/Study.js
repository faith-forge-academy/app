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
import { setGlobalWordCollection, setWordCollectionInstance } from "../features/wordCollectionSlice.js";
import createWordsCollection from '../utils/appUtils.js';

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
    str = str.replaceAll(/[^\w\s]+/gu, '').toLowerCase()
    
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

export default function Study() {
    const dispatch = useDispatch();
    const {
        finalTranscript,
        listening,
        resetTranscript
    } = useSpeechRecognition();

    const [spokenText, setSpokenText] = useState(useSelector((state) => { return state.verse}))
    const v = useSelector((state) => { return state.verse});
    const [activeTab, setActiveTab] = useState(0)
    let [currentWordIndex, setCurrentWordIndex] = useState(0)
    let [wordCounter, setWordCounter] = useState(0)
    const [testSubmission, setTestSubmission] = useState("")
    const [testResult, setTestResult] = useState([])
    let [phraseIndex, setPhraseIndex] = useState(useSelector((state) => {return state.phrase}));    
    let scriptureWordCollection = useSelector((state) => {return state.wordCollection});
    let phraseCount = 0;
    let phraseNums = [];
    let transSplits = [];
    let nextPhrase = 1;
    let scriptureWordInstance;
    let currentWord;
    let curr;
  
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
    
    if (typeof scriptureWordCollection == 'object' && Array.isArray(scriptureWordCollection) && scriptureWordCollection.length == 0) {
      scriptureWordCollection = createWordsCollection(scripture.text);
      dispatch(setGlobalWordCollection(scriptureWordCollection));
    }
    
    phraseCount = scriptureWordCollection[scriptureWordCollection.length - 1].phrase;

    for (let i = 1; i <= phraseCount; i++) {
      phraseNums.push(i);
    }


    if (typeof finalTranscript == 'string' && finalTranscript !== ""){
        let cleanfinalTranscript = stripPunctuation(finalTranscript);
        transSplits = cleanfinalTranscript.trim().split(/\s+/)
    }

    for (let i in transSplits) {
        let nextI = wordCounter + 1;
        let prevI = wordCounter - 1;
        let prevWord = scriptureWordCollection[`${prevI}`];
        let nextWord = scriptureWordCollection[`${nextI}`];
      
        curr = transSplits[i].toLowerCase() //transSplits should just be a phrase or a subset of the overall array
        
        if (typeof scripture.splitText[wordCounter] == 'string') {
          currentWord = scripture.splitText[wordCounter].toLowerCase(); // this is an array of all words in the passage
        }
        
        scriptureWordInstance = {...scriptureWordCollection[wordCounter]};

        if (typeof prevWord != 'undefined') {
          
          if (prevWord['phrase'] < scriptureWordInstance['phrase']) {
              setSpokenText("");
              resetTranscript();
          }
        }

        if (typeof nextWord != 'undefined') {
          nextPhrase = nextWord.phrase;
        }

        console.log(curr, currentWord, wordCounter, curr === currentWord)
        
        if (curr === currentWord){
            scriptureWordInstance.said = true;

            dispatch(setGlobalPhrase(nextPhrase));
            setPhraseIndex(nextPhrase);

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

        dispatch(setWordCollectionInstance(scriptureWordInstance));
    }

  /**
   * This useEffect watches for when the active tab changes value and resets
   * spoken text, test result, and test submission
   */
  useEffect(() => {
    setSpokenText("")
    setTestResult([])
    setTestSubmission("")
  }, [activeTab])

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
          color: (wordObj.said) ? '#000000' : '#CCCCCC',
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
