import React from "react";

import { useState, useEffect, useRef } from "react"

import Button from '@mui/material/Button';

import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';

// import { CardDescription, CardTitle, CardActions } from "@/components/ui/card"

import Tabs from '@mui/material/Tabs';
import Box from '@mui/material/Box';

//TODO: Fix tabs
// import { CustomTabPanel, TabsList, TabsTrigger } from "@/components/ui/tabs"

//TODO: Does MUI have a Textarea component???
// import { Textarea } from "@/components/ui/textarea"

//TODO:: Does MUI have a ScrollArea component???
// import { ScrollArea } from "@/components/ui/scroll-area"


import { Mic, MicOff, Check, ArrowRight, ArrowLeft } from "lucide-react"

// Mock scripture data (replace with actual data in a real application)
const scripture = {
  reference: "John 3:16",
  text: "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life."
}

// Simple word-by-word comparison function
function compareWords(original: string, spoken: string): { correct: boolean; word: string }[] {
  const originalWords = original.toLowerCase().split(/\s+/)
  const spokenWords = spoken.toLowerCase().split(/\s+/)
  return originalWords.map((word, index) => ({
    correct: index < spokenWords.length && word === spokenWords[index],
    word: word
  }))
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
  const [activeTab, setActiveTab] = useState("read")
  const [isListening, setIsListening] = useState(false)
  const [spokenText, setSpokenText] = useState("")
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [practiceResult, setPracticeResult] = useState([])
  const [testSubmission, setTestSubmission] = useState("")
  const [testResult, setTestResult] = useState([])
  const recognitionRef = useRef(null)

  useEffect(() => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = true
      recognitionRef.current.interimResults = true

      recognitionRef.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('')
        
        if (activeTab === "practice") {
          setSpokenText(transcript)
          const result = compareWords(scripture.text, transcript)
          setPracticeResult(result)
          // Check if the last word spoken matches the current word
          const currentWord = scripture.text.split(/\s+/)[currentWordIndex].toLowerCase()
          const lastSpokenWord = transcript.trim().split(/\s+/).pop()?.toLowerCase()
          if (currentWord === lastSpokenWord) {
            // If correct, move to the next word and reset speech recognition
            setCurrentWordIndex(prev => Math.min(prev + 1, scripture.text.split(/\s+/).length - 1))
            if (recognitionRef.current) {
              recognitionRef.current.stop()
              recognitionRef.current.start()
            }
            setSpokenText("")
          }
        } else if (activeTab === "test") {
          // Only update for final results in test mode
          if (event.results[event.results.length - 1].isFinal) {
            setTestSubmission(transcript)
            setTestResult(compareWords(scripture.text, transcript))
          }
        }
      }
    }
  }, [activeTab, currentWordIndex])

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop()
    } else {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
        recognitionRef.current.start()
      }
      setSpokenText("")
    }
    setIsListening(!isListening)
  }

  const handleTestSubmit = () => {
    setTestResult(compareWords(scripture.text, testSubmission))
  }

  const nextWord = () => {
    setCurrentWordIndex(prev => Math.min(prev + 1, scripture.text.split(/\s+/).length - 1))
  }

  const prevWord = () => {
    setCurrentWordIndex(prev => Math.max(prev - 1, 0))
  }

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        Scripture Learning
        Read, practice, and test your scripture knowledge
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
            <Tabs label="Read" {...a11yProps(0)} />
            <Tabs label="Practice" {...a11yProps(1)} />
            <Tabs label="Test" {...a11yProps(2)} />
        </Tabs>
          <CustomTabPanel value={activeTab} index={0}> 
            <Card>
              <CardHeader>
                {scripture.reference}
              </CardHeader>
              <CardContent>
                  <p>{scripture.text}</p>
              </CardContent>
            </Card>
          </CustomTabPanel>
          <CustomTabPanel value={activeTab} index={1}>
            <Card>
              <CardHeader>
                Word-by-Word Practice
                Practice the scripture word by word
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Button onClick={prevWord} disabled={currentWordIndex === 0}>
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Word {currentWordIndex + 1} of {scripture.text.split(/\s+/).length}
                    </span>
                    <Button onClick={nextWord} disabled={currentWordIndex === scripture.text.split(/\s+/).length - 1}>
                      Next
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                  <div className="text-center text-2xl font-bold p-4 border rounded">
                    {scripture.text.split(/\s+/)[currentWordIndex]}
                  </div>
                  <Button onClick={toggleListening} variant="outline" className="w-full">
                    {isListening ? <MicOff className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
                    {isListening ? "Stop" : "Start"} Listening
                  </Button>
                    {practiceResult.map((result, index) => (
                      <span
                        key={index}
                        className={`inline-block mr-1 ${
                          result.correct ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {result.word}
                      </span>
                    ))}
                </div>
              </CardContent>
            </Card>
          </CustomTabPanel>
          <CustomTabPanel value={activeTab} index={2}>
            <Card>
              <CardHeader>
                Memorization Test
                Type or speak the scripture from memory and check your accuracy
              </CardHeader>
              <CardContent>
                <div className="space-y-4">

                <textarea placeholder="type the scripture here..." onChange={(e) => {setTestSubmission(e.target.value)}} className="min-h-[100px]">{{testSubmission}}</textarea>
                  <div className="flex justify-between">
                    <Button onClick={toggleListening} variant="outline">
                      {isListening ? <MicOff className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
                      {isListening ? "Stop" : "Start"} Listening
                    </Button>
                    <Button onClick={handleTestSubmit}>
                      <Check className="mr-2 h-4 w-4" />
                      Check Answer
                    </Button>
                  </div>
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
                </div>
              </CardContent>
            </Card>
          </CustomTabPanel>
      </CardContent>
      <CardActions className="flex justify-between">
        <Button variant="outline" onClick={() => setActiveTab("read")}>Back to Reading</Button>
        <Button onClick={() => setActiveTab(activeTab === "read" ? "practice" : activeTab === "practice" ? "test" : "read")}>
          Next Mode
        </Button>
      </CardActions>
    </Card>
  );
}
