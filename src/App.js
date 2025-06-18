import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Lightbulb, Keyboard, BookOpen, Settings, Volume2 } from 'lucide-react';
import './App.css'

// Braille mapping - QWERTY keys to Braille dots
const QWERTY_TO_BRAILLE = {
  'd': 1, 'w': 2, 'q': 3, 'k': 4, 'o': 5, 'p': 6
};

// Braille to letter mapping (basic English alphabet)
const BRAILLE_TO_LETTER = {
  '1': 'a', '12': 'b', '14': 'c', '145': 'd', '15': 'e',
  '124': 'f', '1245': 'g', '125': 'h', '24': 'i', '245': 'j',
  '13': 'k', '123': 'l', '134': 'm', '1345': 'n', '135': 'o',
  '1234': 'p', '12345': 'q', '1235': 'r', '234': 's', '2345': 't',
  '136': 'u', '1236': 'v', '2456': 'w', '1346': 'x', '13456': 'y',
  '1356': 'z', '': ' '
};

// Reverse mapping for encoding
const LETTER_TO_BRAILLE = Object.fromEntries(
  Object.entries(BRAILLE_TO_LETTER).map(([k, v]) => [v, k])
);

// Sample dictionary of common words
const DICTIONARY = [
  'hello', 'world', 'braille', 'system', 'typing', 'keyboard',
  'computer', 'screen', 'reader', 'access', 'technology', 'innovation',
  'learning', 'education', 'student', 'teacher', 'school', 'book',
  'reading', 'writing', 'communication', 'language', 'english',
  'alphabet', 'letter', 'word', 'sentence', 'paragraph', 'document',
  'help', 'support', 'assistance', 'guide', 'tutorial', 'practice',
  'exercise', 'lesson', 'chapter', 'section', 'page', 'line',
  'character', 'symbol', 'pattern', 'dot', 'cell', 'grade',
  'tactile', 'touch', 'feel', 'sense', 'finger', 'hand',
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all',
  'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day',
  'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now',
  'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its',
  'let', 'put', 'say', 'she', 'too', 'use'
];

// Trie data structure for efficient word storage and retrieval
class TrieNode {
  constructor() {
    this.children = {};
    this.isEndOfWord = false;
    this.word = '';
  }
}

class Trie {
  constructor() {
    this.root = new TrieNode();
  }

  insert(word) {
    let node = this.root;
    for (let char of word) {
      if (!node.children[char]) {
        node.children[char] = new TrieNode();
      }
      node = node.children[char];
    }
    node.isEndOfWord = true;
    node.word = word;
  }

  searchWithPrefix(prefix) {
    let node = this.root;
    for (let char of prefix) {
      if (!node.children[char]) {
        return [];
      }
      node = node.children[char];
    }
    return this.getAllWords(node);
  }

  getAllWords(node) {
    const words = [];
    if (node.isEndOfWord) {
      words.push(node.word);
    }
    for (let child of Object.values(node.children)) {
      words.push(...this.getAllWords(child));
    }
    return words;
  }
}

// Levenshtein distance algorithm for fuzzy matching
function levenshteinDistance(str1, str2) {
  const matrix = Array(str2.length + 1).fill(null).map(() => 
    Array(str1.length + 1).fill(null)
  );

  for (let i = 0; i <= str1.length; i++) {
    matrix[0][i] = i;
  }
  for (let j = 0; j <= str2.length; j++) {
    matrix[j][0] = j;
  }

  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const substitutionCost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // insertion
        matrix[j - 1][i] + 1, // deletion
        matrix[j - 1][i - 1] + substitutionCost // substitution
      );
    }
  }

  return matrix[str2.length][str1.length];
}

// Braille autocorrect engine
class BrailleAutocorrect {
  constructor(dictionary) {
    this.trie = new Trie();
    this.dictionary = dictionary;
    this.userHistory = [];
    
    // Build trie from dictionary
    dictionary.forEach(word => this.trie.insert(word.toLowerCase()));
  }

  brailleToText(braillePattern) {
    const words = braillePattern.split('  '); // Double space for word separation
    return words.map(word => {
      const chars = word.split(' '); // Single space for character separation
      return chars.map(char => BRAILLE_TO_LETTER[char] || '?').join('');
    }).join(' ');
  }

  textToBraille(text) {
    return text.toLowerCase().split('').map(char => 
      LETTER_TO_BRAILLE[char] || '?'
    ).join(' ');
  }

  getSuggestions(input, maxSuggestions = 5) {
    const inputLower = input.toLowerCase().trim();
    if (!inputLower) return [];

    // First, try exact prefix matches
    const prefixMatches = this.trie.searchWithPrefix(inputLower);
    
    // Then, calculate fuzzy matches for all dictionary words
    const fuzzyMatches = this.dictionary
      .map(word => ({
        word,
        distance: levenshteinDistance(inputLower, word.toLowerCase()),
        score: this.calculateScore(inputLower, word)
      }))
      .filter(match => match.distance <= Math.max(2, Math.floor(inputLower.length * 0.4)))
      .sort((a, b) => b.score - a.score);

    // Combine and deduplicate results
    const combined = [...new Set([...prefixMatches, ...fuzzyMatches.map(m => m.word)])];
    
    return combined.slice(0, maxSuggestions);
  }

  calculateScore(input, candidate) {
    const distance = levenshteinDistance(input, candidate.toLowerCase());
    const lengthDiff = Math.abs(input.length - candidate.length);
    const commonPrefix = this.getCommonPrefixLength(input, candidate.toLowerCase());
    
    // Higher score is better
    let score = 100 - distance * 10 - lengthDiff * 2 + commonPrefix * 5;
    
    // Boost score for words in user history
    if (this.userHistory.includes(candidate.toLowerCase())) {
      score += 20;
    }
    
    return Math.max(0, score);
  }

  getCommonPrefixLength(str1, str2) {
    let i = 0;
    while (i < str1.length && i < str2.length && str1[i] === str2[i]) {
      i++;
    }
    return i;
  }

  addToHistory(word) {
    const wordLower = word.toLowerCase();
    this.userHistory = [wordLower, ...this.userHistory.filter(w => w !== wordLower)].slice(0, 50);
  }
}

// Main App Component
export default function BrailleAutocorrectApp() {
  const [input, setInput] = useState('');
  const [brailleInput, setBrailleInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedWord, setSelectedWord] = useState('');
  const [mode, setMode] = useState('text'); // 'text' or 'braille'
  const [showHelp, setShowHelp] = useState(false);
  const [pressedKeys, setPressedKeys] = useState(new Set());
   const [keyBuffer, setKeyBuffer] = useState(new Set());
   const brailleToText = useCallback((braillePattern) => braillePattern, []);

  // Initialize autocorrect engine
  const autocorrect = useMemo(() => new BrailleAutocorrect(DICTIONARY), []);

  // Handle input changes
  const handleInputChange = useCallback((value) => {
    setInput(value);
    if (value.trim()) {
      const newSuggestions = autocorrect.getSuggestions(value);
      setSuggestions(newSuggestions);
    } else {
      setSuggestions([]);
    }
  }, [autocorrect]);

  // Handle suggestion selection
  const selectSuggestion = useCallback((word) => {
    setInput(word);
    setSelectedWord(word);
    setSuggestions([]);
    autocorrect.addToHistory(word);
    
    // Convert to Braille if in Braille mode
    if (mode === 'braille') {
      setBrailleInput(autocorrect.textToBraille(word));
    }
  }, [autocorrect, mode]);

  // Handle Braille keyboard input
  const handleKeyDown = useCallback((e) => {
    if (mode !== 'braille') return;
    
    const key = e.key.toLowerCase();
    if (QWERTY_TO_BRAILLE[key]) {
      e.preventDefault();
      setPressedKeys(prev => new Set([...prev, key]));
    }
  }, [mode]);

const handleKeyUp = useCallback((e) => {
  if (mode !== 'braille') return;
  const key = e.key.toLowerCase();
  if (QWERTY_TO_BRAILLE[key]) {
    e.preventDefault();

    setPressedKeys(prev => {
      const updated = new Set(prev);
      updated.delete(key);
      return updated;
    });

    setTimeout(() => {
      setKeyBuffer(prev => {
        if (pressedKeys.size === 0 && prev.size > 0) {
          const dots = Array.from(prev)
            .map(k => QWERTY_TO_BRAILLE[k])
            .sort((a, b) => a - b)
            .join('');

          const char = BRAILLE_TO_LETTER[dots] || '?';
          if (char === ' ') {
            setBrailleInput(prevInput => prevInput + '  ');
            handleInputChange('');
          } else {
            setBrailleInput(prevInput => prevInput + char);
            const newBrailleText = brailleInput + char;
            const currentText = brailleToText(newBrailleText);
            const words = currentText.trim().split(/\s+/);
            const lastWord = words[words.length - 1] || '';
            handleInputChange(lastWord);
          }
        }
        return new Set();
      });
    }, 50);
  }
}, [mode, brailleInput, handleInputChange, brailleToText, pressedKeys]);


  // Add event listeners for Braille input
  useEffect(() => {
    if (mode === 'braille') {
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
      };
    }
  }, [mode, handleKeyDown, handleKeyUp]);

  // Clear inputs when switching modes
  const switchMode = (newMode) => {
    setMode(newMode);
    setInput('');
    setBrailleInput('');
    setSuggestions([]);
    setPressedKeys(new Set());
  };

  return (
    <div className="app-container">
      <div className="max-width-container">
        {/* Header */}
        <div className="header">
          <h1 className="main-title">
            Braille Autocorrect System
          </h1>
          <p className="subtitle">
            Advanced autocorrect and suggestion system for Braille input with QWERTY keyboard support
          </p>
        </div>

        {/* Mode Selector */}
        <div className="card">
          <div className="mode-selector">
            <button
              onClick={() => switchMode('text')}
              className={`mode-button ${mode === 'text' ? 'active' : 'inactive'}`}
            >
              <Keyboard className="inline-block w-5 h-5 mr-2" />
              Text Mode
            </button>
            <button
              onClick={() => switchMode('braille')}
              className={`mode-button ${mode === 'braille' ? 'active' : 'inactive'}`}
            >
              <BookOpen className="inline-block w-5 h-5 mr-2" />
              Braille Mode
            </button>
          </div>

          {/* Help Toggle */}
          <div className="help-toggle">
            <button
              onClick={() => setShowHelp(!showHelp)}
              className="help-button"
            >
              <Lightbulb className="inline-block w-4 h-4 mr-1" />
              {showHelp ? 'Hide' : 'Show'} Help
            </button>
          </div>
        </div>

        {/* Help Section */}
        {showHelp && (
          <div className="help-section">
            <h2 className="help-title">
              How to Use
            </h2>
            <div className="help-content">
              <p><strong>Text Mode:</strong> Type normally and get autocorrect suggestions.</p>
              <p><strong>Braille Mode:</strong> Use QWERTY keys for Braille input:</p>
              <div className="help-grid">
                <div>D = Dot 1</div>
                <div>W = Dot 2</div>
                <div>Q = Dot 3</div>
                <div>K = Dot 4</div>
                <div>O = Dot 5</div>
                <div>P = Dot 6</div>
              </div>
              <p className="help-content-note">Press multiple keys simultaneously to form Braille characters.</p>
            </div>
          </div>
        )}

        {/* Input Section */}
        <div className="card input-section">
          <div className="space-y-4"> {/* Keeping space-y-4 as it's a common spacing utility not specific to Tailwind's core functions */}
            {mode === 'text' ? (
              <div>
                <label className="input-label">
                  Type your text:
                </label>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => handleInputChange(e.target.value)}
                  placeholder="Start typing to get suggestions..."
                  className="text-input"
                />
              </div>
            ) : (
              <div>
                <label className="input-label">
                  Braille Input (use D, W, Q, K, O, P keys):
                </label>
                <div className="braille-input-container">
                  <input
                    type="text"
                    value={brailleInput}
                    readOnly
                    placeholder="Press Braille keys to input..."
                    className="braille-input"
                  />
                 {pressedKeys.size > 0 && (
              <div className="pressed-keys card input-section">
                <div><strong>Keys:</strong> {Array.from(pressedKeys).join(', ').toUpperCase()}</div>
                <div><strong>Live Text:</strong> {
                  BRAILLE_TO_LETTER[
                    Array.from(pressedKeys)
                      .map(k => QWERTY_TO_BRAILLE[k])
                      .sort((a, b) => a - b)
                      .join('')
                  ] || '?'
                }</div>
              </div>
            )}
            
                </div>
                {brailleInput && (
                  <div className="braille-text-display">
                    <span className="braille-text-label">Text: </span>
                    <span className="braille-text-content">
                      {autocorrect.brailleToText(brailleInput)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Current Input Display */}
            {input && (
              <div className="current-input">
                <span className="current-input-label">Current input: </span>
                <span className="current-input-text">{input}</span>
              </div>
            )}
          </div>
        </div>

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="suggestions-section">
            <h2 className="suggestions-title">
              <Search className="w-5 h-5 mr-2" />
              Suggestions
            </h2>
            <div className="suggestions-grid">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => selectSuggestion(suggestion)}
                  className="suggestion-button"
                >
                  <div className="suggestion-word">{suggestion}</div>
                  <div className="suggestion-braille">
                    Braille: {autocorrect.textToBraille(suggestion)}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Selected Word Display */}
        {selectedWord && (
          <div className="selected-word-section">
            <h2 className="selected-word-title">
              Selected Word
            </h2>
            <div className="selected-word-content">
              <div>
                <span className="selected-word-label">Text: </span>
                <span className="selected-word-text">{selectedWord}</span>
              </div>
              <div>
                <span className="selected-word-label">Braille Pattern: </span>
                <span className="selected-word-braille">
                  {autocorrect.textToBraille(selectedWord)}
                </span>
              </div>
              <div className="selected-word-note">
                This word has been added to your learning history for better future suggestions.
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="footer">
          <p>Braille Autocorrect System - Powered by Advanced Pattern Matching</p>
          <p className="footer-note">Supports real-time suggestions with learning capabilities</p>
        </div>
      </div>
    </div>
  );
}