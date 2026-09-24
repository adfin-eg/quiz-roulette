import { useState, useEffect, useRef } from 'react';
import { Plus, Minus, ChevronLeft, ChevronRight, Upload, Loader2, Info, Sparkles, Brain, Wand2, HelpCircle, Pencil, Check, AlertCircle } from 'lucide-react';
import confetti, { type Shape } from 'canvas-confetti';
import { FileFormatView } from './FileFormatView';
import { PlayfulQuestionMark, PlayfulCheckMark, PlayfulExclamation } from './QuizIcons';
import { ConfettiRainLoading } from './ConfettiRainLoading';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

export interface GameData {
  categories: Array<{ id: number; title: string }>;
  questionsAndAnswers: Record<string, { 
    question: string; 
    answer: string;
    questionImageUrl?: string;
    answerImageUrl?: string;
    alternatives?: string[];
  }>;
}

interface SetupViewProps {
  initialPlayerNames?: string[];
  onComplete: (playerNames: string[], gameData: GameData) => void;
  onGoBack: (currentPlayerNames?: string[], currentPlayerCount?: number) => void;
}

// All available categories from the question pool
const AVAILABLE_CATEGORIES = [
  'Movies',
  'Geography',
  'Science',
  'Pop Culture',
  'History',
  'Sports',
  'Literature',
  'Music',
  'Technology',
  'Animals',
  'Art',
  'TV Shows',
  'Mythology',
  'Space & Astronomy',
  'Video Games',
  'Fashion',
  'Architecture',
  'World Leaders',
  'Languages',
  'Philosophy',
  'Inventions',
  'Nature',
  'Board Games & Puzzles',
  'UX Design',
  'Design',
  'Mathematics',
  'Food',
  'Norway',
  'Sweden'
];

// Utility function to detect if text is an image URL
function isImageUrl(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  const trimmed = text.trim();
  // Check if it has common image extensions
  const imagePattern = /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?.*)?$/i;
  // Check if it's from known image hosting services or contains domain pattern
  const domainPattern = /^(https?:\/\/|www\.)?[a-zA-Z0-9-]+\.[a-zA-Z0-9.-]+/i;
  const imageHostPattern = /(unsplash\.com|imgur\.com|cloudinary\.com|imagekit\.io|variety\.com)/i;
  
  // Must either have image extension OR be from known image host
  return (domainPattern.test(trimmed) && imagePattern.test(trimmed)) || 
         (domainPattern.test(trimmed) && imageHostPattern.test(trimmed));
}

// Normalize URL by adding https:// if missing
function normalizeUrl(url: string): string {
  if (!url) return url;
  const trimmed = url.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  // Add https:// for www. or bare domain URLs
  return `https://${trimmed}`;
}

// Extract text, image URL, and alternatives from a cell
function parseContentWithImage(text: string): { text: string; imageUrl?: string; alternatives?: string[] } {
  if (!text || typeof text !== 'string') return { text: '' };
  
  // Pattern to find URLs (including www. URLs and bare domain URLs)
  const urlPattern = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z0-9.-]+\/[^\s]+)/gi;
  const urls = text.match(urlPattern) || [];
  
  // Find the first image URL
  let imageUrl: string | undefined;
  let originalUrl: string | undefined; // Track original URL for removal
  for (const url of urls) {
    if (isImageUrl(url)) {
      originalUrl = url; // Store original URL
      imageUrl = normalizeUrl(url); // Normalize the URL to include protocol
      break;
    }
  }
  
  // Pattern to find alternatives (A), B), C), D)) - handles both inline and multi-line formats
  // Match A), B), C), or D) followed by text until the next alternative or end
  const alternativesPattern = /\s*([A-D]\))\s*(.+?)(?=\s+[A-D]\)|$)/g;
  const alternativeMatches = [...text.matchAll(alternativesPattern)];
  
  let alternatives: string[] | undefined;
  let cleanedText = text;
  
  // If alternatives found, extract them
  if (alternativeMatches && alternativeMatches.length > 0) {
    alternatives = alternativeMatches
      .map(match => `${match[1]} ${match[2].trim()}`) // Combine letter with text (e.g., "A) Red")
      .filter(alt => alt.length > 3) // Filter out empty alternatives (just "A) ")
      .slice(0, 4); // Max 4 alternatives
    
    // If we have valid alternatives, remove the entire alternatives section from the main text
    if (alternatives.length > 0) {
      // Find the position where alternatives start
      const firstAltMatch = text.match(/\s*[A-D]\)/);
      if (firstAltMatch && firstAltMatch.index !== undefined) {
        cleanedText = text.substring(0, firstAltMatch.index).trim();
      }
    }
  }
  
  // If imageUrl found, remove the ORIGINAL URL from text
  if (originalUrl) {
    cleanedText = cleanedText.replace(originalUrl, '');
  }
  
  cleanedText = cleanedText.trim();
  
  return { 
    text: cleanedText, 
    imageUrl,
    alternatives: alternatives && alternatives.length > 0 ? alternatives : undefined
  };
}

export function SetupView({ initialPlayerNames = [], onComplete, onGoBack }: SetupViewProps) {
  const [step, setStep] = useState(1);
  const [previousStep, setPreviousStep] = useState(1);
  const [playerCount, setPlayerCount] = useState(initialPlayerNames.length > 0 ? initialPlayerNames.length : 4);
  const [playerNames, setPlayerNames] = useState<string[]>(initialPlayerNames);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['', '', '', '']);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showFileFormat, setShowFileFormat] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(0);
  const [focusedButtonStep3, setFocusedButtonStep3] = useState(-1); // -1: no focus, 0: Upload, 1: Pick Topics, 2: Surprise Me
  const firstInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadButtonRef = useRef<HTMLButtonElement>(null);
  const pickTopicsButtonRef = useRef<HTMLButtonElement>(null);
  const surpriseMeButtonRef = useRef<HTMLButtonElement>(null);
  const MIN_PLAYERS = 1;
  const MAX_PLAYERS = 8;

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Check if we're in an input field
      const target = e.target as HTMLElement;
      const isInInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      
      // Check if in a dropdown (Select component) on step 4 - check both target and activeElement
      const isInDropdown = step === 4 && (
        target.getAttribute('data-slot') === 'select-trigger' || // Event target is select trigger
        target.getAttribute('role') === 'option' || // Event target is option
        target.closest('[data-slot="select-trigger"]') !== null || // Event target is inside select trigger
        target.closest('[data-slot="select-content"]') !== null || // Event target is inside select content
        document.querySelector('[data-slot="select-content"]') !== null // Dropdown content is open
      );
      
      // Handle Enter and Space for navigation
      if (e.key === 'Enter' || e.key === ' ') {
        // Only allow Space navigation when not in an input field
        if (e.key === ' ' && isInInput) {
          return; // Let space work normally in input fields
        }
        
        // Don't handle navigation if in a dropdown on step 4
        if (isInDropdown) {
          return; // Let dropdown handle Space and Enter
        }
        
        if (e.key === ' ') {
          e.preventDefault(); // Prevent page scroll
        }
        
        if (step === 1) {
          handleNextFromStep1();
        } else if (step === 2) {
          handleNextFromStep2();
        } else if (step === 4) {
          handleNextFromStep4();
        }
        // Step 3 doesn't have Enter/Space handler - user must click a button
      }
      
      // Handle arrow keys for navigation
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        // Step 2 input field navigation is handled by handleInputKeyDown
        // If not in input field, allow navigation on all steps except step 3 (which has custom button navigation)
        if (!isInInput && step !== 3) {
          if (e.key === 'ArrowLeft') {
            e.preventDefault();
            handleGoBack({ stopPropagation: () => {} } as React.MouseEvent);
          } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            // Only trigger next on steps that have a next button
            if (step === 1) {
              handleNextFromStep1();
            } else if (step === 2) {
              handleNextFromStep2();
            } else if (step === 4) {
              handleNextFromStep4();
            }
          }
        }
      }
      
      // Handle arrow up/down for player count on step 1
      if (!isInInput && step === 1) {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setPlayerCount(prev => Math.min(prev + 1, MAX_PLAYERS));
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          setPlayerCount(prev => Math.max(prev - 1, MIN_PLAYERS));
        }
      }
      
      // Handle arrow up/down for dropdown field navigation on step 4
      if (step === 4 && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        // Check if a select trigger is focused and dropdown is NOT open
        const isSelectTriggerFocused = target.getAttribute('data-slot') === 'select-trigger';
        const isDropdownOpen = document.querySelector('[data-slot="select-content"]') !== null;
        
        // Only handle arrow keys when dropdown is NOT open
        if (!isDropdownOpen) {
          // Find all select triggers
          const selectTriggers = document.querySelectorAll('[data-slot="select-trigger"]');
          
          // If no select trigger is focused and arrow down is pressed, focus the first field
          if (!isSelectTriggerFocused && e.key === 'ArrowDown' && selectTriggers.length > 0) {
            e.preventDefault();
            (selectTriggers[0] as HTMLElement).focus();
          } else if (isSelectTriggerFocused) {
            e.preventDefault();
            
            const currentIndex = Array.from(selectTriggers).indexOf(target as Element);
            
            if (currentIndex !== -1) {
              if (e.key === 'ArrowUp' && currentIndex > 0) {
                // Focus previous field
                (selectTriggers[currentIndex - 1] as HTMLElement).focus();
              } else if (e.key === 'ArrowDown' && currentIndex < selectTriggers.length - 1) {
                // Focus next field
                (selectTriggers[currentIndex + 1] as HTMLElement).focus();
              }
            }
          }
        }
      }
      
      // Handle arrow left/right navigation for buttons on step 3
      if (!isInInput && step === 3) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          if (focusedButtonStep3 === -1) {
            // Navigate to previous page when no button is focused
            setPreviousStep(step);
            setStep(2);
          } else if (focusedButtonStep3 === 0) {
            // Unfocus when pressing left from first button
            setFocusedButtonStep3(-1);
          } else {
            // Travel between buttons
            setFocusedButtonStep3(focusedButtonStep3 - 1);
          }
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          if (focusedButtonStep3 === -1) {
            setFocusedButtonStep3(0); // Start at first button
          } else {
            setFocusedButtonStep3(Math.min(focusedButtonStep3 + 1, 2));
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyPress, { capture: true });
  }, [step, playerCount, selectedCategories, onComplete, focusedButtonStep3]);

  // Auto-focus input when step 2 is shown
  useEffect(() => {
    if (step === 2) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        // If coming from step 3 (going back), focus the last field
        if (previousStep === 3) {
          const lastInput = document.querySelector(`input[data-player-index="${playerNames.length - 1}"]`) as HTMLInputElement;
          lastInput?.focus();
          lastInput?.select();
        } 
        // Otherwise (coming from step 1), focus the first field
        else if (firstInputRef.current) {
          firstInputRef.current?.focus();
          firstInputRef.current?.select();
        }
      }, 50);
    }
  }, [step, previousStep, playerNames.length]);
  
  // Reset button focus when entering step 3
  useEffect(() => {
    if (step === 3) {
      setFocusedButtonStep3(-1);
    }
  }, [step]);
  
  // Focus the appropriate button on step 3 when focusedButtonStep3 changes
  useEffect(() => {
    if (step === 3) {
      const buttons = [uploadButtonRef, pickTopicsButtonRef, surpriseMeButtonRef];
      if (focusedButtonStep3 >= 0) {
        buttons[focusedButtonStep3].current?.focus();
      } else if (focusedButtonStep3 === -1) {
        // Unfocus all buttons
        buttons.forEach(btn => btn.current?.blur());
      }
    }
  }, [focusedButtonStep3, step]);

  // Rotate loading messages
  useEffect(() => {
    if (isGenerating) {
      const interval = setInterval(() => {
        setLoadingMessage(prev => (prev + 1) % 5);
      }, 1500);
      return () => clearInterval(interval);
    }
  }, [isGenerating]);

  const handleGoBack = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (step === 1) {
      onGoBack(playerNames, playerCount);
    } else {
      setPreviousStep(step);
      setStep(step - 1);
    }
  };

  const handleNextFromStep1 = () => {
    // Initialize player names array, preserving existing names
    if (playerNames.length !== playerCount) {
      const newPlayerNames = Array(playerCount).fill('');
      // Copy over any existing names
      for (let i = 0; i < Math.min(playerNames.length, playerCount); i++) {
        newPlayerNames[i] = playerNames[i];
      }
      setPlayerNames(newPlayerNames);
    }
    setPreviousStep(step);
    setStep(2);
  };

  const handleNextFromStep2 = () => {
    // Fill in any empty player names with defaults
    setPlayerNames(prev => prev.map((name, i) => 
      name.trim() === '' ? `PLAYER ${i + 1}` : name
    ));
    setPreviousStep(step);
    setStep(3);
  };

  const handleNextFromStep4 = async () => {
    // Fill in any empty categories with random selections
    const filledCategories = [...selectedCategories];
    const usedCategories = new Set(selectedCategories.filter(cat => cat !== ''));
    
    // Get available categories that haven't been selected
    const availableForRandom = AVAILABLE_CATEGORIES.filter(cat => !usedCategories.has(cat));
    
    // Shuffle available categories for random selection
    const shuffled = [...availableForRandom].sort(() => Math.random() - 0.5);
    let randomIndex = 0;
    
    // Fill empty slots with random categories
    for (let i = 0; i < filledCategories.length; i++) {
      if (filledCategories[i] === '') {
        filledCategories[i] = shuffled[randomIndex];
        randomIndex++;
      }
    }
    
    setIsGenerating(true);
    
    try {
      const gameData = await generateQuestionsFromCategories(filledCategories);
      
      // Trigger subtle sparkling stars animation
      const count = 50;
      const defaults = {
        spread: 360,
        ticks: 100,
        gravity: 0,
        decay: 0.94,
        startVelocity: 10,
        shapes: ['star'] as Shape[],
        colors: ['#FFFFFF'],
        scalar: 0.6
      };

      function randomInRange(min: number, max: number) {
        return Math.random() * (max - min) + min;
      }

      // Transition to game board first
      setTimeout(() => {
        onComplete(playerNames, gameData);
      }, 50);

      // Start sparkle animation after a delay so it shows over the game board
      setTimeout(() => {
        const interval = setInterval(() => {
          confetti({
            ...defaults,
            particleCount: 3,
            origin: {
              x: randomInRange(0.1, 0.9),
              y: randomInRange(0.1, 0.9)
            }
          });
        }, 100);

        // Clear interval after animation completes
        setTimeout(() => {
          clearInterval(interval);
        }, 1500);
      }, 50);
    } catch (error) {
      console.error('Failed to generate questions:', error);
      alert('Failed to generate questions. Please try again or try a different approach.');
      setIsGenerating(false);
    }
  };

  const handleNext = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (step === 1) {
      handleNextFromStep1();
    } else if (step === 2) {
      handleNextFromStep2();
    } else if (step === 4) {
      await handleNextFromStep4();
    }
    // Step 3 doesn't use the NEXT button
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPlayerCount(prev => Math.min(prev + 1, MAX_PLAYERS));
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPlayerCount(prev => Math.max(prev - 1, MIN_PLAYERS));
  };

  const handlePlayerNameChange = (index: number, value: string) => {
    // Remove leading spaces and replace double spaces with single spaces
    let sanitizedValue = value.replace(/^\s+/, '').replace(/\s{2,}/g, ' ');
    
    setPlayerNames(prev => {
      const newNames = [...prev];
      newNames[index] = sanitizedValue;
      return newNames;
    });
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    // Handle Cmd+A (Mac) or Ctrl+A (Windows/Linux) to select all text
    if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
      e.preventDefault();
      e.currentTarget.select();
      return;
    }
    
    // Handle arrow left/right navigation between fields
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      const inputElement = e.currentTarget;
      const cursorPos = inputElement.selectionStart || 0;
      const textLength = inputElement.value.length;
      
      if (e.key === 'ArrowLeft' && cursorPos === 0) {
        e.preventDefault();
        if (index === 0) {
          // First field - go to previous page
          handleGoBack({ stopPropagation: () => {} } as React.MouseEvent);
        } else {
          // Go to previous field
          const prevInput = document.querySelector(`input[data-player-index="${index - 1}"]`) as HTMLInputElement;
          prevInput?.focus();
          prevInput?.select();
        }
        return;
      }
      
      if (e.key === 'ArrowRight' && cursorPos === textLength) {
        e.preventDefault();
        if (index === playerNames.length - 1) {
          // Last field - fill in any empty player names with defaults and go to next page
          setPlayerNames(prev => prev.map((name, i) => 
            name.trim() === '' ? `PLAYER ${i + 1}` : name
          ));
          setPreviousStep(step);
          setStep(3);
        } else {
          // Go to next field
          const nextInput = document.querySelector(`input[data-player-index="${index + 1}"]`) as HTMLInputElement;
          nextInput?.focus();
          nextInput?.select();
        }
        return;
      }
    }
    
    // Handle arrow up/down navigation
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (index > 0) {
        const prevInput = document.querySelector(`input[data-player-index="${index - 1}"]`) as HTMLInputElement;
        prevInput?.focus();
        prevInput?.select();
      }
      return;
    }
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (index < playerNames.length - 1) {
        const nextInput = document.querySelector(`input[data-player-index="${index + 1}"]`) as HTMLInputElement;
        nextInput?.focus();
        nextInput?.select();
      }
      return;
    }
    
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      
      if (step === 2) {
        // Move to next input or go to next step if last
        if (index < playerNames.length - 1) {
          const nextInput = document.querySelector(`input[data-player-index="${index + 1}"]`) as HTMLInputElement;
          nextInput?.focus();
        } else {
          handleNextFromStep2();
        }
      }
    }
    
    // Handle Space key to navigate from last input field
    if (e.key === ' ') {
      const inputElement = e.currentTarget;
      const cursorPos = inputElement.selectionStart || 0;
      const textLength = inputElement.value.length;
      
      // If in the last field and cursor is at the end, Space navigates to next page
      if (index === playerNames.length - 1 && cursorPos === textLength) {
        e.preventDefault();
        e.stopPropagation();
        handleNextFromStep2();
        return;
      }
    }
  };

  const handleCategoryChange = (index: number, value: string) => {
    setSelectedCategories(prev => {
      const newCategories = [...prev];
      newCategories[index] = value;
      return newCategories;
    });
  };

  const handleUploadClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  const handleDownloadTemplate = async (e: React.MouseEvent) => {
    e.stopPropagation();

    // Create a new workbook using ExcelJS
    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Jeopardy Questions');
    
    // Define the template data
    const templateData = [
      // Row 1: Category headers
      ['CATEGORY 1', 'CATEGORY 2', 'CATEGORY 3', 'CATEGORY 4'],
      // Rows 2-6: Questions
      ['Question for 200', 'What kind of questions can be uploaded to Team Hawkeye\'s Quiz Roulette?', 'Question for 200', 'Question for 200'],
      ['Question for 400', 'What is this? https://miro.medium.com/v2/resize:fit:1920/1*Qz7g5KqC-gIr3lGlPxZ31w.jpeg', 'Question for 400', 'Question for 400'],
      ['Question for 600', 'What is the colour of a UX designer\'s favourite hat? A) Red B) Green C) Blue D) Black', 'Question for 600', 'Question for 600'],
      ['Question for 800', 'Question for 800', 'Question for 800', 'Question for 800'],
      ['Question for 1000', 'Question for 1000', 'Question for 1000', 'Question for 1000'],
      // Rows 7-11: Answers
      ['Answer for 200', 'Plain text, questions with images and questions with alternatives', 'Answer for 200', 'Answer for 200'],
      ['Answer for 400', 'The first Apple Macintosh', 'Answer for 400', 'Answer for 400'],
      ['Answer for 600', 'B) Green, of course 😉', 'Answer for 600', 'Answer for 600'],
      ['Answer for 800', 'Answer for 800', 'Answer for 800', 'Answer for 800'],
      ['Answer for 1000', 'Answer for 1000', 'Answer for 1000', 'Answer for 1000'],
    ];
    
    // Add rows to worksheet
    templateData.forEach((rowData, rowIndex) => {
      const row = worksheet.addRow(rowData);
      
      // Set row height to 75px (56.25 points, since 1 point ≈ 1.333 pixels)
      row.height = 56.25;
      
      // Apply formatting to each cell in the row
      row.eachCell((cell, colNumber) => {
        // Set alignment to center-middle and wrap text
        cell.alignment = {
          vertical: 'middle',
          horizontal: 'center',
          wrapText: true
        };
        
        // Format cell as text to prevent URL auto-conversion
        cell.numFmt = '@';
        
        // Set background color to Jeopardy blue (#071277)
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF071277' }
        };
        
        // Set font size to 16pt
        // Category headers (row 0): yellow/gold text
        // Questions (rows 1-5): white text
        // Answers (rows 6-10): light blue text
        if (rowIndex === 0) {
          // Categories: yellow/gold (#fdc065)
          cell.font = { 
            bold: true, 
            size: 16, 
            color: { argb: 'FFFDC065' } 
          };
        } else if (rowIndex >= 6) {
          // Answers: light blue (#707EFF)
          cell.font = { 
            size: 16, 
            color: { argb: 'FF707EFF' } 
          };
        } else {
          // Questions: white
          cell.font = { 
            size: 16, 
            color: { argb: 'FFFFFFFF' } 
          };
        }
      });
    });
    
    // Set column widths to 350px (approximately 50 character units for better accuracy)
    worksheet.columns = [
      { width: 50 },
      { width: 50 },
      { width: 50 },
      { width: 50 }
    ];
    
    // Generate Excel file and trigger download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Generate filename with current date in DDMMYYYY format
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear()).slice(-2);
    const dateString = `${day}${month}${year}`;
    
    link.download = `Quiz_${dateString}.xlsx`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const generateAIQuestions = async (preselectedCategories?: string[]): Promise<GameData> => {
    // Simulate AI generation delay
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Large pool of categories and questions to ensure variety each time
    const questionPool = {
      'Movies': [
        { question: "What animated movie features a cowboy named Woody?", answer: "Toy Story" },
        { question: "Who played Iron Man in the Marvel movies?", answer: "Robert Downey Jr." },
        { question: "What 1994 film features Tom Hanks on a park bench with chocolates?", answer: "Forrest Gump" },
        { question: "Which director is known for Inception and The Dark Knight trilogy?", answer: "Christopher Nolan" },
        { question: "What film won Best Picture at the Oscars in 2020 making history as the first non-English language winner?", answer: "Parasite" },
        { question: "Who directed the 1975 thriller Jaws?", answer: "Steven Spielberg" },
        { question: "What 1999 film features a character named Neo discovering reality is a simulation?", answer: "The Matrix" },
        { question: "Which actress played Hermione Granger in the Harry Potter films?", answer: "Emma Watson" },
        { question: "What 2010 film takes place entirely within dreams?", answer: "Inception" },
        { question: "Who composed the iconic Star Wars theme music?", answer: "John Williams" },
        { question: "What movie features a character saying 'I'll be back'?", answer: "The Terminator" },
        { question: "Which film features a giant ape climbing the Empire State Building?", answer: "King Kong" },
        { question: "What 1997 film about a doomed ship became the highest-grossing movie of its time?", answer: "Titanic" },
        { question: "Who directed Pulp Fiction?", answer: "Quentin Tarantino" },
        { question: "What is the name of the fictional African country in Black Panther?", answer: "Wakanda" },
        { question: "Which actor played Jack Dawson in Titanic?", answer: "Leonardo DiCaprio" },
        { question: "What horror film features a possessed doll named Annabelle?", answer: "The Conjuring" },
        { question: "Who played the Joker in The Dark Knight?", answer: "Heath Ledger" },
        { question: "What 2009 film about blue aliens became the highest-grossing movie of all time?", answer: "Avatar" },
        { question: "Which film trilogy features Frodo Baggins?", answer: "The Lord of the Rings" },
        { question: "What 1972 film features Marlon Brando as a mafia boss?", answer: "The Godfather" },
        { question: "Which film features the line 'Here's looking at you, kid'?", answer: "Casablanca" },
        { question: "Who directed E.T. the Extra-Terrestrial?", answer: "Steven Spielberg" },
        { question: "What Disney film features the song 'Let It Go'?", answer: "Frozen" },
        { question: "Which actor played Captain Jack Sparrow?", answer: "Johnny Depp" },
        { question: "What film franchise features Agent 007?", answer: "James Bond" },
        { question: "Who directed The Shawshank Redemption?", answer: "Frank Darabont" },
        { question: "What film features a young girl named Dorothy traveling to Oz?", answer: "The Wizard of Oz" },
        { question: "Which actress played Katniss Everdeen in The Hunger Games?", answer: "Jennifer Lawrence" },
        { question: "What 2001 film features a character named Shrek?", answer: "Shrek" },
        { question: "Who directed Schindler's List?", answer: "Steven Spielberg" },
        { question: "What film features the character Hannibal Lecter?", answer: "The Silence of the Lambs" },
        { question: "Which actor played Wolverine in the X-Men films?", answer: "Hugh Jackman" },
        { question: "What 2008 film features a villain who wants to watch the world burn?", answer: "The Dark Knight" },
        { question: "Who directed Jurassic Park?", answer: "Steven Spielberg" },
        { question: "What film features Tom Cruise hanging from the side of a plane?", answer: "Mission: Impossible - Rogue Nation" },
        { question: "Which film won Best Picture in 2024?", answer: "Oppenheimer" },
        { question: "What 1994 Disney film features a lion cub named Simba?", answer: "The Lion King" },
        { question: "Who played Maximus in Gladiator?", answer: "Russell Crowe" },
        { question: "What film features the phrase 'May the Force be with you'?", answer: "Star Wars" }
      ],
      'Geography': [
        { question: "What is the capital of France?", answer: "Paris" },
        { question: "Which continent is the Sahara Desert located on?", answer: "Africa" },
        { question: "What is the smallest country in the world?", answer: "Vatican City" },
        { question: "Which African country has Swahili and English as official languages?", answer: "Kenya" },
        { question: "What is the only country that borders both the Atlantic and Indian Oceans?", answer: "South Africa" },
        { question: "What is the longest river in the world?", answer: "The Nile" },
        { question: "Which country has the most natural lakes?", answer: "Canada" },
        { question: "What is the capital of Australia?", answer: "Canberra" },
        { question: "Which mountain range separates Europe from Asia?", answer: "The Ural Mountains" },
        { question: "What is the largest island in the world?", answer: "Greenland" },
        { question: "What is the capital of Japan?", answer: "Tokyo" },
        { question: "Which ocean is the largest?", answer: "Pacific Ocean" },
        { question: "What is the driest place on Earth?", answer: "Atacama Desert" },
        { question: "Which country has the longest coastline?", answer: "Canada" },
        { question: "What is the tallest mountain in the world?", answer: "Mount Everest" },
        { question: "Which U.S. state is the largest by area?", answer: "Alaska" },
        { question: "What is the capital of Brazil?", answer: "Brasília" },
        { question: "Which sea is the lowest point on Earth?", answer: "Dead Sea" },
        { question: "What is the only country to span two continents?", answer: "Turkey (or Russia)" },
        { question: "Which African country was never colonized?", answer: "Ethiopia" },
        { question: "What is the capital of Italy?", answer: "Rome" },
        { question: "Which desert is the largest hot desert in the world?", answer: "Sahara Desert" },
        { question: "What is the capital of Spain?", answer: "Madrid" },
        { question: "Which country has the most time zones?", answer: "France" },
        { question: "What is the smallest U.S. state by area?", answer: "Rhode Island" },
        { question: "Which river flows through Paris?", answer: "Seine" },
        { question: "What is the capital of Egypt?", answer: "Cairo" },
        { question: "Which country is home to the Great Barrier Reef?", answer: "Australia" },
        { question: "What is the largest lake in Africa?", answer: "Lake Victoria" },
        { question: "Which city is known as the 'City of Love'?", answer: "Paris" },
        { question: "What is the capital of Canada?", answer: "Ottawa" },
        { question: "Which country has the most active volcanoes?", answer: "Indonesia" },
        { question: "What is the second-largest country by land area?", answer: "Canada" },
        { question: "Which mountain range runs through South America?", answer: "The Andes" },
        { question: "What is the capital of Thailand?", answer: "Bangkok" },
        { question: "Which river is the longest in Europe?", answer: "Volga River" },
        { question: "What is the largest country entirely in Europe?", answer: "Ukraine" },
        { question: "Which U.S. state is known as the 'Sunshine State'?", answer: "Florida" },
        { question: "What is the capital of Argentina?", answer: "Buenos Aires" },
        { question: "Which continent has no permanent population?", answer: "Antarctica" }
      ],
      'Science': [
        { question: "What planet is known as the Red Planet?", answer: "Mars" },
        { question: "What gas do plants absorb from the atmosphere?", answer: "Carbon dioxide" },
        { question: "What is the hardest natural substance on Earth?", answer: "Diamond" },
        { question: "What is the powerhouse of the cell?", answer: "Mitochondria" },
        { question: "What is the name of the effect where light bends when passing through a gravitational field?", answer: "Gravitational lensing" },
        { question: "What is the chemical symbol for gold?", answer: "Au" },
        { question: "How many bones does an adult human have?", answer: "206" },
        { question: "What is the speed of light in a vacuum?", answer: "299,792,458 meters per second" },
        { question: "What type of animal is a Komodo dragon?", answer: "Lizard" },
        { question: "What particle is known as the 'God particle'?", answer: "Higgs boson" },
        { question: "What is the largest planet in our solar system?", answer: "Jupiter" },
        { question: "What is H2O commonly known as?", answer: "Water" },
        { question: "How many chromosomes do humans have?", answer: "46" },
        { question: "What is the study of earthquakes called?", answer: "Seismology" },
        { question: "What is the closest star to Earth?", answer: "The Sun" },
        { question: "What element has the atomic number 1?", answer: "Hydrogen" },
        { question: "What force keeps planets in orbit around the sun?", answer: "Gravity" },
        { question: "What is the largest organ in the human body?", answer: "Skin" },
        { question: "What is the process by which plants make food called?", answer: "Photosynthesis" },
        { question: "What is the boiling point of water in Celsius?", answer: "100 degrees" },
        { question: "What is the chemical symbol for iron?", answer: "Fe" },
        { question: "How many planets are in our solar system?", answer: "8" },
        { question: "What is the study of life called?", answer: "Biology" },
        { question: "What gas makes up most of Earth's atmosphere?", answer: "Nitrogen" },
        { question: "What is the smallest unit of life?", answer: "Cell" },
        { question: "What is the center of an atom called?", answer: "Nucleus" },
        { question: "What type of rock is formed from cooled lava?", answer: "Igneous" },
        { question: "What is the chemical formula for table salt?", answer: "NaCl" },
        { question: "How many teeth does an adult human typically have?", answer: "32" },
        { question: "What is the study of weather called?", answer: "Meteorology" },
        { question: "What organ pumps blood through the body?", answer: "Heart" },
        { question: "What is the smallest bone in the human body?", answer: "Stapes (in the ear)" },
        { question: "What is dry ice made of?", answer: "Frozen carbon dioxide" },
        { question: "What is the most abundant element in the universe?", answer: "Hydrogen" },
        { question: "What is the pH of pure water?", answer: "7" },
        { question: "What part of the brain controls balance?", answer: "Cerebellum" },
        { question: "What is the freezing point of water in Fahrenheit?", answer: "32 degrees" },
        { question: "What is the smallest planet in our solar system?", answer: "Mercury" },
        { question: "What type of blood cells fight infection?", answer: "White blood cells" },
        { question: "What is the study of fungi called?", answer: "Mycology" }
      ],
      'Pop Culture': [
        { question: "What social media platform is known for short videos and dances?", answer: "TikTok" },
        { question: "Who is the lead singer of Coldplay?", answer: "Chris Martin" },
        { question: "What TV show features characters living in Central Perk coffee shop?", answer: "Friends" },
        { question: "Which streaming service produced the series The Crown?", answer: "Netflix" },
        { question: "What year did Beyoncé release her visual album Lemonade?", answer: "2016" },
        { question: "Who is known as the 'King of Pop'?", answer: "Michael Jackson" },
        { question: "What reality show features a rose ceremony?", answer: "The Bachelor" },
        { question: "Which artist has the most Grammy Awards?", answer: "Beyoncé" },
        { question: "What is the name of Taylor Swift's fanbase?", answer: "Swifties" },
        { question: "Which superhero is also known as the Dark Knight?", answer: "Batman" },
        { question: "What TV series features the character Walter White?", answer: "Breaking Bad" },
        { question: "Which celebrity couple is known as 'Brangelina'?", answer: "Brad Pitt and Angelina Jolie" },
        { question: "What is the name of Kim Kardashian's shapewear brand?", answer: "SKIMS" },
        { question: "Who voices Elsa in Frozen?", answer: "Idina Menzel" },
        { question: "What is the longest-running animated TV show in the U.S.?", answer: "The Simpsons" },
        { question: "Which artist performed at the 2023 Super Bowl halftime show?", answer: "Rihanna" },
        { question: "What HBO series features dragons and the Iron Throne?", answer: "Game of Thrones" },
        { question: "Who is the creator of the Marvel Cinematic Universe on screen?", answer: "Kevin Feige" },
        { question: "What music festival ended in disaster in 2017 promoted by influencers?", answer: "Fyre Festival" },
        { question: "Which K-pop group released the hit song 'Dynamite'?", answer: "BTS" },
        { question: "What animated series features the Belcher family?", answer: "Bob's Burgers" },
        { question: "Who played Tony Stark's assistant Pepper Potts?", answer: "Gwyneth Paltrow" },
        { question: "What Netflix series features Eleven and the Upside Down?", answer: "Stranger Things" },
        { question: "Which rapper's real name is Aubrey Graham?", answer: "Drake" },
        { question: "What is Ariana Grande's fanbase called?", answer: "Arianators" },
        { question: "Who is known as 'Queen Bey'?", answer: "Beyoncé" },
        { question: "What social media platform uses a blue bird as its logo?", answer: "Twitter (X)" },
        { question: "Which boy band was Harry Styles a member of?", answer: "One Direction" },
        { question: "What is the name of Kanye West's fashion brand?", answer: "Yeezy" },
        { question: "Who hosts The Tonight Show?", answer: "Jimmy Fallon" },
        { question: "What Netflix show features a chess prodigy named Beth Harmon?", answer: "The Queen's Gambit" },
        { question: "Which Kardashian sister is the oldest?", answer: "Kourtney" },
        { question: "What is Lady Gaga's real first name?", answer: "Stefani" },
        { question: "Who created the TV series Euphoria?", answer: "Sam Levinson" },
        { question: "What is the name of Rihanna's beauty brand?", answer: "Fenty Beauty" },
        { question: "Which artist is known as 'The Weeknd'?", answer: "Abel Tesfaye" },
        { question: "What HBO series is based on a video game and stars Pedro Pascal?", answer: "The Last of Us" },
        { question: "Who voices Maui in Moana?", answer: "Dwayne 'The Rock' Johnson" },
        { question: "What is Billie Eilish's fanbase called?", answer: "Avocados" },
        { question: "Which streaming service created Wednesday?", answer: "Netflix" }
      ],
      'History': [
        { question: "In what year did World War II end?", answer: "1945" },
        { question: "Who was the first president of the United States?", answer: "George Washington" },
        { question: "What ancient wonder is located in Egypt?", answer: "The Great Pyramid of Giza" },
        { question: "Which empire was ruled by Julius Caesar?", answer: "Roman Empire" },
        { question: "What year did the Berlin Wall fall?", answer: "1989" },
        { question: "Who was the first person to walk on the moon?", answer: "Neil Armstrong" },
        { question: "What ship sank in 1912 after hitting an iceberg?", answer: "The Titanic" },
        { question: "Which Egyptian queen was romantically linked to Julius Caesar and Mark Antony?", answer: "Cleopatra" },
        { question: "What year did Christopher Columbus reach the Americas?", answer: "1492" },
        { question: "Who wrote the Declaration of Independence?", answer: "Thomas Jefferson" },
        { question: "What year did World War I begin?", answer: "1914" },
        { question: "Who was the first female prime minister of the United Kingdom?", answer: "Margaret Thatcher" },
        { question: "What year did the American Civil War begin?", answer: "1861" },
        { question: "Which ancient city was buried by the eruption of Mount Vesuvius?", answer: "Pompeii" },
        { question: "Who was the longest-reigning British monarch before Elizabeth II?", answer: "Queen Victoria" },
        { question: "What was the name of the first human civilization?", answer: "Sumer (or Mesopotamia)" },
        { question: "In what year did the French Revolution begin?", answer: "1789" },
        { question: "Who led India to independence from British rule?", answer: "Mahatma Gandhi" },
        { question: "What year did the Soviet Union collapse?", answer: "1991" },
        { question: "Which U.S. president abolished slavery?", answer: "Abraham Lincoln" },
        { question: "What year did the United States declare independence?", answer: "1776" },
        { question: "Who was the first emperor of Rome?", answer: "Augustus" },
        { question: "What year did the Great Depression begin?", answer: "1929" },
        { question: "Who assassinated President John F. Kennedy?", answer: "Lee Harvey Oswald" },
        { question: "What year did the attack on Pearl Harbor occur?", answer: "1941" },
        { question: "Who was the youngest U.S. president ever elected?", answer: "John F. Kennedy" },
        { question: "What year did the Spanish Armada attempt to invade England?", answer: "1588" },
        { question: "Who was the first woman to fly solo across the Atlantic?", answer: "Amelia Earhart" },
        { question: "What year did the Black Death begin in Europe?", answer: "1347" },
        { question: "Who built the Great Wall of China?", answer: "Emperor Qin Shi Huang" },
        { question: "What year did World War II begin?", answer: "1939" },
        { question: "Who was the longest-serving U.S. president?", answer: "Franklin D. Roosevelt" },
        { question: "What year was the Magna Carta signed?", answer: "1215" },
        { question: "Who was the first European to reach India by sea?", answer: "Vasco da Gama" },
        { question: "What year did the Cold War officially end?", answer: "1991" },
        { question: "Who discovered penicillin?", answer: "Alexander Fleming" },
        { question: "What year was the printing press invented?", answer: "1440" },
        { question: "Who led the Mongol Empire?", answer: "Genghis Khan" },
        { question: "What year did D-Day occur?", answer: "1944" },
        { question: "Who was the first Black president of South Africa?", answer: "Nelson Mandela" }
      ],
      'Sports': [
        { question: "How many players are on a soccer team on the field?", answer: "11" },
        { question: "What sport is known as 'the beautiful game'?", answer: "Soccer (Football)" },
        { question: "How many Grand Slam tournaments are there in tennis?", answer: "4" },
        { question: "What color jersey does the Tour de France leader wear?", answer: "Yellow" },
        { question: "How many points is a touchdown worth in American football?", answer: "6" },
        { question: "Which country has won the most FIFA World Cups?", answer: "Brazil" },
        { question: "What is the diameter of a basketball hoop in inches?", answer: "18" },
        { question: "How many holes are played in a standard round of golf?", answer: "18" },
        { question: "What is it called when a bowler makes three strikes in a row?", answer: "A turkey" },
        { question: "Which athlete has won the most Olympic gold medals?", answer: "Michael Phelps" },
        { question: "What sport does Serena Williams play?", answer: "Tennis" },
        { question: "How many players are on a baseball team on the field?", answer: "9" },
        { question: "What is the national sport of Canada?", answer: "Lacrosse (officially) or Ice Hockey" },
        { question: "In what sport would you perform a slam dunk?", answer: "Basketball" },
        { question: "What is the maximum score in a single frame of bowling?", answer: "30" },
        { question: "Which sport uses terms like 'love', 'deuce', and 'advantage'?", answer: "Tennis" },
        { question: "How many minutes are in a regulation NBA basketball game?", answer: "48" },
        { question: "What is the only sport to have been played on the moon?", answer: "Golf" },
        { question: "Which boxer was known as 'The Greatest'?", answer: "Muhammad Ali" },
        { question: "What is the diameter of a regulation soccer ball in inches?", answer: "8.65 inches" },
        { question: "How many rings are on the Olympic flag?", answer: "5" },
        { question: "What is the term for zero score in tennis?", answer: "Love" },
        { question: "How many quarters are in an NFL game?", answer: "4" },
        { question: "What do you call three consecutive strikes in bowling?", answer: "A turkey" },
        { question: "Which sport is called 'the sport of kings'?", answer: "Horse racing" },
        { question: "How many players are on a volleyball team?", answer: "6" },
        { question: "What is the highest possible break in snooker?", answer: "147" },
        { question: "Which tennis player has won the most Grand Slam titles?", answer: "Novak Djokovic" },
        { question: "How many bases are on a baseball diamond?", answer: "4" },
        { question: "What is the term for a score of one under par in golf?", answer: "Birdie" },
        { question: "Which country hosted the 2016 Summer Olympics?", answer: "Brazil" },
        { question: "How many points is a field goal worth in basketball?", answer: "2 or 3" },
        { question: "What is the fastest recorded tennis serve?", answer: "Over 160 mph" },
        { question: "Which sport uses a puck instead of a ball?", answer: "Ice hockey" },
        { question: "How many periods are in a hockey game?", answer: "3" },
        { question: "What is the national sport of Japan?", answer: "Sumo wrestling" },
        { question: "How many players are on an ice hockey team on the ice?", answer: "6" },
        { question: "What is a score of two under par in golf called?", answer: "Eagle" },
        { question: "Which country won the first ever FIFA World Cup in 1930?", answer: "Uruguay" },
        { question: "How many points is a safety worth in American football?", answer: "2" }
      ],
      'Literature': [
        { question: "Who wrote 'Romeo and Juliet'?", answer: "William Shakespeare" },
        { question: "What is the name of Harry Potter's owl?", answer: "Hedwig" },
        { question: "Who wrote '1984'?", answer: "George Orwell" },
        { question: "What is the first book in the Lord of the Rings trilogy?", answer: "The Fellowship of the Ring" },
        { question: "Who wrote 'Pride and Prejudice'?", answer: "Jane Austen" },
        { question: "What is the name of the wizarding school in Harry Potter?", answer: "Hogwarts" },
        { question: "Who wrote 'To Kill a Mockingbird'?", answer: "Harper Lee" },
        { question: "In what book series would you find the character Katniss Everdeen?", answer: "The Hunger Games" },
        { question: "Who wrote 'The Great Gatsby'?", answer: "F. Scott Fitzgerald" },
        { question: "What dystopian novel features a society divided into factions?", answer: "Divergent" },
        { question: "Who wrote the Harry Potter series?", answer: "J.K. Rowling" },
        { question: "What is the name of Sherlock Holmes' assistant?", answer: "Dr. Watson" },
        { question: "Who wrote 'The Catcher in the Rye'?", answer: "J.D. Salinger" },
        { question: "What is the first line of 'A Tale of Two Cities'?", answer: "It was the best of times, it was the worst of times" },
        { question: "Who wrote 'Moby Dick'?", answer: "Herman Melville" },
        { question: "What novel begins with 'Call me Ishmael'?", answer: "Moby Dick" },
        { question: "Who created the character James Bond?", answer: "Ian Fleming" },
        { question: "What is the longest novel ever written?", answer: "In Search of Lost Time (by Marcel Proust)" },
        { question: "Who wrote 'The Chronicles of Narnia'?", answer: "C.S. Lewis" },
        { question: "What Shakespeare play features the characters Rosencrantz and Guildenstern?", answer: "Hamlet" },
        { question: "Who wrote 'Frankenstein'?", answer: "Mary Shelley" },
        { question: "What is the name of Don Quixote's horse?", answer: "Rocinante" },
        { question: "Who wrote 'Brave New World'?", answer: "Aldous Huxley" },
        { question: "What is the first Harry Potter book called?", answer: "Harry Potter and the Philosopher's Stone (or Sorcerer's Stone)" },
        { question: "Who wrote 'The Odyssey'?", answer: "Homer" },
        { question: "What is the name of the dystopian novel by Ray Bradbury about burning books?", answer: "Fahrenheit 451" },
        { question: "Who wrote 'Jane Eyre'?", answer: "Charlotte Brontë" },
        { question: "What is Atticus Finch's profession in 'To Kill a Mockingbird'?", answer: "Lawyer" },
        { question: "Who wrote 'Wuthering Heights'?", answer: "Emily Brontë" },
        { question: "What is the name of the captain in Moby Dick?", answer: "Captain Ahab" },
        { question: "Who wrote 'The Hobbit'?", answer: "J.R.R. Tolkien" },
        { question: "What is the name of the pig leader in 'Animal Farm'?", answer: "Napoleon" },
        { question: "Who wrote 'Dracula'?", answer: "Bram Stoker" },
        { question: "What book features a character named Holden Caulfield?", answer: "The Catcher in the Rye" },
        { question: "Who wrote 'The Picture of Dorian Gray'?", answer: "Oscar Wilde" },
        { question: "What is the name of the author who wrote under the pen name George Eliot?", answer: "Mary Ann Evans" },
        { question: "Who wrote 'Of Mice and Men'?", answer: "John Steinbeck" },
        { question: "What Shakespeare play features the line 'To be or not to be'?", answer: "Hamlet" },
        { question: "Who wrote 'The Adventures of Tom Sawyer'?", answer: "Mark Twain" },
        { question: "What is Gatsby's first name in 'The Great Gatsby'?", answer: "Jay" }
      ],
      'Music': [
        { question: "Which band sang 'Bohemian Rhapsody'?", answer: "Queen" },
        { question: "What instrument has 88 keys?", answer: "Piano" },
        { question: "Who is known as the 'Queen of Soul'?", answer: "Aretha Franklin" },
        { question: "What is the best-selling album of all time?", answer: "Thriller by Michael Jackson" },
        { question: "Which band was John Lennon a member of?", answer: "The Beatles" },
        { question: "What does DJ stand for?", answer: "Disc Jockey" },
        { question: "Which classical composer became deaf?", answer: "Ludwig van Beethoven" },
        { question: "What music genre originated in Jamaica?", answer: "Reggae" },
        { question: "Who sang 'Purple Rain'?", answer: "Prince" },
        { question: "What is the lowest female singing voice?", answer: "Contralto" },
        { question: "What rock band is Freddie Mercury associated with?", answer: "Queen" },
        { question: "How many strings does a standard guitar have?", answer: "6" },
        { question: "What is Elvis Presley's middle name?", answer: "Aaron" },
        { question: "Which artist is known as 'The Boss'?", answer: "Bruce Springsteen" },
        { question: "What was the first music video played on MTV?", answer: "Video Killed the Radio Star" },
        { question: "Who sang 'Rolling in the Deep'?", answer: "Adele" },
        { question: "What is the highest male singing voice?", answer: "Countertenor" },
        { question: "Which rapper's real name is Marshall Mathers?", answer: "Eminem" },
        { question: "What year was Woodstock music festival held?", answer: "1969" },
        { question: "Who was the lead singer of Nirvana?", answer: "Kurt Cobain" },
        { question: "What instrument does Yo-Yo Ma play?", answer: "Cello" },
        { question: "Which band released the album 'Abbey Road'?", answer: "The Beatles" },
        { question: "What is Taylor Swift's lucky number?", answer: "13" },
        { question: "Who sang 'Respect'?", answer: "Aretha Franklin" },
        { question: "What is the term for a group of four musicians?", answer: "Quartet" },
        { question: "Which artist is known as 'The King of Rock and Roll'?", answer: "Elvis Presley" },
        { question: "How many lines are on a musical staff?", answer: "5" },
        { question: "Who sang 'Like a Rolling Stone'?", answer: "Bob Dylan" },
        { question: "What genre of music did Miles Davis pioneer?", answer: "Jazz" },
        { question: "Which classical composer wrote 'The Four Seasons'?", answer: "Antonio Vivaldi" },
        { question: "What is Madonna's full first name?", answer: "Madonna Louise" },
        { question: "Who sang 'I Will Always Love You'?", answer: "Whitney Houston" },
        { question: "What is the longest-running musical on Broadway?", answer: "The Phantom of the Opera" },
        { question: "Which band sang 'Hotel California'?", answer: "The Eagles" },
        { question: "What instrument does Lizzo play?", answer: "Flute" },
        { question: "Who composed the opera 'The Magic Flute'?", answer: "Wolfgang Amadeus Mozart" },
        { question: "What year did MTV launch?", answer: "1981" },
        { question: "Which country singer is known as 'The Man in Black'?", answer: "Johnny Cash" },
        { question: "How many symphonies did Beethoven compose?", answer: "9" },
        { question: "Who sang 'Imagine'?", answer: "John Lennon" }
      ],
      'Food & Drink': [
        { question: "What is the main ingredient in guacamole?", answer: "Avocado" },
        { question: "What type of pasta is shaped like little ears?", answer: "Orecchiette" },
        { question: "What country is the origin of the cocktail Mojito?", answer: "Cuba" },
        { question: "What is the most expensive spice in the world by weight?", answer: "Saffron" },
        { question: "What nut is used to make marzipan?", answer: "Almond" },
        { question: "What is the primary ingredient in hummus?", answer: "Chickpeas" },
        { question: "Which country invented ice cream?", answer: "China" },
        { question: "What is the main ingredient in a traditional Japanese miso soup?", answer: "Miso paste" },
        { question: "What type of alcohol is made from agave?", answer: "Tequila" },
        { question: "What Italian dessert literally means 'pick me up'?", answer: "Tiramisu" },
        { question: "What fruit is known as the 'king of fruits'?", answer: "Durian" },
        { question: "What is the main ingredient in bread?", answer: "Flour" },
        { question: "What country is sushi originally from?", answer: "Japan" },
        { question: "What is the most consumed beverage in the world after water?", answer: "Tea" },
        { question: "What is the key ingredient in a traditional Caesar salad dressing?", answer: "Anchovies" },
        { question: "What type of cheese is used on traditional Margherita pizza?", answer: "Mozzarella" },
        { question: "What is the main ingredient in tahini?", answer: "Sesame seeds" },
        { question: "Which country is famous for inventing champagne?", answer: "France" },
        { question: "What is the hottest part of a chili pepper?", answer: "The seeds and white membrane" },
        { question: "What French soup is made from onions and beef stock?", answer: "French onion soup" },
        { question: "What is the national dish of Spain?", answer: "Paella" },
        { question: "What vegetable is used to make pickles?", answer: "Cucumber" },
        { question: "What is the main ingredient in pesto?", answer: "Basil" },
        { question: "Which country is famous for fondue?", answer: "Switzerland" },
        { question: "What type of alcohol is gin made from?", answer: "Juniper berries" },
        { question: "What is the main ingredient in a traditional Greek tzatziki?", answer: "Yogurt" },
        { question: "What fruit has its seeds on the outside?", answer: "Strawberry" },
        { question: "What is sake made from?", answer: "Rice" },
        { question: "What type of pasta is used in macaroni and cheese?", answer: "Elbow macaroni" },
        { question: "What is the most popular pizza topping in the United States?", answer: "Pepperoni" },
        { question: "What is calamari made from?", answer: "Squid" },
        { question: "What type of pastry is used for a croissant?", answer: "Puff pastry (or laminated dough)" },
        { question: "What bean is used to make coffee?", answer: "Coffee bean" },
        { question: "What is the national dish of India?", answer: "Curry (or Biryani)" },
        { question: "What spice gives curry its yellow color?", answer: "Turmeric" },
        { question: "What is Champagne if it's not from the Champagne region of France?", answer: "Sparkling wine" },
        { question: "What type of cheese is Brie?", answer: "Soft cheese" },
        { question: "What is the main ingredient in traditional Japanese ramen broth?", answer: "Pork or chicken stock" },
        { question: "What fruit is used to make wine?", answer: "Grapes" },
        { question: "What is the name of the Japanese dish of battered and fried seafood or vegetables?", answer: "Tempura" }
      ],
      'Technology': [
        { question: "What does 'HTTP' stand for?", answer: "Hypertext Transfer Protocol" },
        { question: "Who co-founded Apple Inc. with Steve Jobs?", answer: "Steve Wozniak" },
        { question: "What does 'URL' stand for?", answer: "Uniform Resource Locator" },
        { question: "What year was the first iPhone released?", answer: "2007" },
        { question: "What does 'AI' stand for in computing?", answer: "Artificial Intelligence" },
        { question: "Which company developed the Android operating system?", answer: "Google" },
        { question: "What does 'RAM' stand for?", answer: "Random Access Memory" },
        { question: "Who founded Tesla Motors?", answer: "Elon Musk" },
        { question: "What programming language is known for its use in web development and has a coffee-related name?", answer: "Java" },
        { question: "What does 'USB' stand for?", answer: "Universal Serial Bus" },
        { question: "What does 'WiFi' stand for?", answer: "Wireless Fidelity" },
        { question: "Who founded Facebook?", answer: "Mark Zuckerberg" },
        { question: "What does 'CPU' stand for?", answer: "Central Processing Unit" },
        { question: "What year was Google founded?", answer: "1998" },
        { question: "What does 'HTML' stand for?", answer: "Hypertext Markup Language" },
        { question: "Which company makes the PlayStation?", answer: "Sony" },
        { question: "What is the name of Amazon's voice assistant?", answer: "Alexa" },
        { question: "What does 'VR' stand for?", answer: "Virtual Reality" },
        { question: "Who invented the World Wide Web?", answer: "Tim Berners-Lee" },
        { question: "What does 'GPS' stand for?", answer: "Global Positioning System" },
        { question: "What does 'PDF' stand for?", answer: "Portable Document Format" },
        { question: "Which company makes the Xbox?", answer: "Microsoft" },
        { question: "What year was YouTube founded?", answer: "2005" },
        { question: "What does 'SSD' stand for?", answer: "Solid State Drive" },
        { question: "Who founded Microsoft?", answer: "Bill Gates (and Paul Allen)" },
        { question: "What programming language is named after a type of snake?", answer: "Python" },
        { question: "What does 'IoT' stand for?", answer: "Internet of Things" },
        { question: "Which company developed the Windows operating system?", answer: "Microsoft" },
        { question: "What is the name of Apple's voice assistant?", answer: "Siri" },
        { question: "What does 'DNS' stand for?", answer: "Domain Name System" },
        { question: "What year was Twitter (X) founded?", answer: "2006" },
        { question: "What does 'LED' stand for?", answer: "Light Emitting Diode" },
        { question: "Who is the CEO of SpaceX?", answer: "Elon Musk" },
        { question: "What is the name of Google's web browser?", answer: "Chrome" },
        { question: "What does 'API' stand for?", answer: "Application Programming Interface" },
        { question: "Which company acquired Instagram in 2012?", answer: "Facebook (Meta)" },
        { question: "What year was Amazon founded?", answer: "1994" },
        { question: "What does 'GPU' stand for?", answer: "Graphics Processing Unit" },
        { question: "Who founded PayPal?", answer: "Elon Musk, Peter Thiel, and Max Levchin" },
        { question: "What programming language is primarily used for iOS app development?", answer: "Swift" }
      ],
      'Animals': [
        { question: "What is the largest land animal?", answer: "African elephant" },
        { question: "How many hearts does an octopus have?", answer: "3" },
        { question: "What is a baby kangaroo called?", answer: "Joey" },
        { question: "What is the fastest land animal?", answer: "Cheetah" },
        { question: "What type of animal is a Flemish Giant?", answer: "Rabbit" },
        { question: "What is the only mammal capable of true flight?", answer: "Bat" },
        { question: "How long is an elephant pregnant for?", answer: "22 months" },
        { question: "What is a group of lions called?", answer: "A pride" },
        { question: "What bird is known for its elaborate mating dance?", answer: "Peacock" },
        { question: "What is the largest species of shark?", answer: "Whale shark" },
        { question: "What is the tallest animal in the world?", answer: "Giraffe" },
        { question: "How many legs does a spider have?", answer: "8" },
        { question: "What is the slowest animal on land?", answer: "Three-toed sloth" },
        { question: "What is the only continent where penguins live in the wild?", answer: "Antarctica" },
        { question: "What animal has the longest lifespan?", answer: "Greenland shark (or bowhead whale)" },
        { question: "What is a female deer called?", answer: "Doe" },
        { question: "How many chambers does a cow's stomach have?", answer: "4" },
        { question: "What is the national animal of Australia?", answer: "Kangaroo" },
        { question: "What animal can hold its breath underwater the longest?", answer: "Cuvier's beaked whale" },
        { question: "What is the most venomous snake in the world?", answer: "Inland taipan" },
        { question: "What is the largest living bird?", answer: "Ostrich" },
        { question: "How many legs does an insect have?", answer: "6" },
        { question: "What is a group of crows called?", answer: "A murder" },
        { question: "What animal is known as 'man's best friend'?", answer: "Dog" },
        { question: "What is the fastest marine animal?", answer: "Sailfish" },
        { question: "How many humps does a Bactrian camel have?", answer: "2" },
        { question: "What is a baby goat called?", answer: "Kid" },
        { question: "What animal can change its color to match its surroundings?", answer: "Chameleon" },
        { question: "What is the largest cat species?", answer: "Tiger" },
        { question: "How many legs does a lobster have?", answer: "10" },
        { question: "What bird can fly backwards?", answer: "Hummingbird" },
        { question: "What is a group of fish called?", answer: "A school" },
        { question: "What animal has the most powerful bite force?", answer: "Saltwater crocodile" },
        { question: "What is a baby swan called?", answer: "Cygnet" },
        { question: "How many legs does a crab have?", answer: "10" },
        { question: "What is the largest mammal in the world?", answer: "Blue whale" },
        { question: "What animal sleeps standing up?", answer: "Horse" },
        { question: "What is the only marsupial found in North America?", answer: "Opossum" },
        { question: "What bird is a symbol of peace?", answer: "Dove" },
        { question: "What is the loudest animal on Earth?", answer: "Blue whale (or sperm whale)" }
      ],
      'Art': [
        { question: "Who painted the Mona Lisa?", answer: "Leonardo da Vinci" },
        { question: "What art movement is Salvador Dalí associated with?", answer: "Surrealism" },
        { question: "In what museum is the Mona Lisa displayed?", answer: "The Louvre" },
        { question: "Who painted 'The Starry Night'?", answer: "Vincent van Gogh" },
        { question: "What Spanish artist is famous for co-founding Cubism?", answer: "Pablo Picasso" },
        { question: "What is the art of folding paper called?", answer: "Origami" },
        { question: "Who sculpted the statue of David?", answer: "Michelangelo" },
        { question: "What Mexican artist is known for her self-portraits and unibrow?", answer: "Frida Kahlo" },
        { question: "What primary colors mix to make purple?", answer: "Red and blue" },
        { question: "What is the pointillism technique?", answer: "Painting with small dots of color" },
        { question: "Who painted 'The Scream'?", answer: "Edvard Munch" },
        { question: "What is the name of the chapel ceiling painted by Michelangelo?", answer: "Sistine Chapel" },
        { question: "Which Dutch artist cut off his own ear?", answer: "Vincent van Gogh" },
        { question: "What art movement does Claude Monet belong to?", answer: "Impressionism" },
        { question: "Who painted 'The Persistence of Memory' with melting clocks?", answer: "Salvador Dalí" },
        { question: "What is a three-color painting scheme called?", answer: "Triadic" },
        { question: "Who painted 'Girl with a Pearl Earring'?", answer: "Johannes Vermeer" },
        { question: "What is the term for a painting done on wet plaster?", answer: "Fresco" },
        { question: "Which American artist is known for pop art of Campbell's soup cans?", answer: "Andy Warhol" },
        { question: "What Renaissance artist was also an inventor and scientist?", answer: "Leonardo da Vinci" },
        { question: "What artist painted 'Guernica'?", answer: "Pablo Picasso" },
        { question: "What is the art of beautiful handwriting called?", answer: "Calligraphy" },
        { question: "Who painted 'American Gothic'?", answer: "Grant Wood" },
        { question: "What is the name of Michelangelo's famous sculpture of Mary holding Jesus?", answer: "Pietà" },
        { question: "Which artist is famous for painting water lilies?", answer: "Claude Monet" },
        { question: "What art movement is characterized by geometric shapes and bold colors?", answer: "Abstract art (or Cubism)" },
        { question: "Who painted 'The Birth of Venus'?", answer: "Sandro Botticelli" },
        { question: "What is a self-portrait?", answer: "A portrait of oneself by oneself" },
        { question: "Who painted 'The Last Supper'?", answer: "Leonardo da Vinci" },
        { question: "What primary colors mix to make green?", answer: "Blue and yellow" },
        { question: "What Dutch artist painted 'The Night Watch'?", answer: "Rembrandt" },
        { question: "What is the term for art made from assembled found objects?", answer: "Collage (or assemblage)" },
        { question: "Who painted 'Nighthawks'?", answer: "Edward Hopper" },
        { question: "What art movement did Jackson Pollock pioneer?", answer: "Abstract Expressionism" },
        { question: "Who sculpted 'The Thinker'?", answer: "Auguste Rodin" },
        { question: "What are the three primary colors?", answer: "Red, blue, and yellow" },
        { question: "Who painted 'Las Meninas'?", answer: "Diego Velázquez" },
        { question: "What is the art of creating three-dimensional works called?", answer: "Sculpture" },
        { question: "Who painted 'The Kiss'?", answer: "Gustav Klimt" },
        { question: "What Renaissance artist painted the School of Athens?", answer: "Raphael" }
      ],
      'TV Shows': [
        { question: "What TV show features a chemistry teacher turned meth cook?", answer: "Breaking Bad" },
        { question: "What is the name of the coffee shop in Friends?", answer: "Central Perk" },
        { question: "Who plays Eleven in Stranger Things?", answer: "Millie Bobby Brown" },
        { question: "What is the longest-running primetime TV show in the U.S.?", answer: "The Simpsons" },
        { question: "What Netflix series is set in the 1980s in Hawkins, Indiana?", answer: "Stranger Things" },
        { question: "Who is the main character in The Office (US)?", answer: "Michael Scott" },
        { question: "What TV series features the character Sheldon Cooper?", answer: "The Big Bang Theory" },
        { question: "What HBO series is based on George R.R. Martin's novels?", answer: "Game of Thrones" },
        { question: "What is the name of the bar in How I Met Your Mother?", answer: "MacLaren's Pub" },
        { question: "Who plays Wednesday Addams in Wednesday?", answer: "Jenna Ortega" },
        { question: "What TV show features a paper company in Scranton, Pennsylvania?", answer: "The Office" },
        { question: "What animated show features the Griffin family?", answer: "Family Guy" },
        { question: "Who is the main character in Ted Lasso?", answer: "Ted Lasso" },
        { question: "What Netflix series features a money heist in Spain?", answer: "Money Heist (La Casa de Papel)" },
        { question: "What TV show features dragons and White Walkers?", answer: "Game of Thrones" },
        { question: "Who plays the main character in The Mandalorian?", answer: "Pedro Pascal" },
        { question: "What is the name of the high school in Glee?", answer: "William McKinley High School" },
        { question: "What TV show features a mockumentary style about a paper company?", answer: "The Office" },
        { question: "Who is the host of Jeopardy! since 2021?", answer: "Ken Jennings (and Mayim Bialik)" },
        { question: "What Netflix series features chess prodigy Beth Harmon?", answer: "The Queen's Gambit" },
        { question: "What TV show features the character Dwight Schrute?", answer: "The Office" },
        { question: "Who plays Geralt of Rivia in The Witcher?", answer: "Henry Cavill" },
        { question: "What animated show is set in Springfield?", answer: "The Simpsons" },
        { question: "What Netflix series features a group of teenagers solving supernatural mysteries?", answer: "Stranger Things" },
        { question: "Who is the main character in Suits?", answer: "Harvey Specter (and Mike Ross)" },
        { question: "What TV show features the phrase 'Winter is coming'?", answer: "Game of Thrones" },
        { question: "What is the name of the kingdom in Game of Thrones with the Iron Throne?", answer: "Westeros" },
        { question: "Who plays the main character in Sherlock?", answer: "Benedict Cumberbatch" },
        { question: "What TV show features a group of scientists and Penny?", answer: "The Big Bang Theory" },
        { question: "What animated show features Bart, Lisa, and Maggie?", answer: "The Simpsons" },
        { question: "Who is the showrunner of Grey's Anatomy?", answer: "Shonda Rhimes" },
        { question: "What TV show features the character Ross Geller?", answer: "Friends" },
        { question: "What Netflix series is about a royal family in England?", answer: "The Crown" },
        { question: "Who plays the main character in House?", answer: "Hugh Laurie" },
        { question: "What TV show features the phrase 'How you doin'?'", answer: "Friends" },
        { question: "What animated show features Stan, Kyle, Cartman, and Kenny?", answer: "South Park" },
        { question: "Who plays the main character in Dexter?", answer: "Michael C. Hall" },
        { question: "What TV show features a plane crash on a mysterious island?", answer: "Lost" },
        { question: "What Netflix series features a group of superheroes called The Seven?", answer: "The Boys" },
        { question: "Who is the creator of The Simpsons?", answer: "Matt Groening" }
      ],
      'Mythology': [
        { question: "Who is the king of the gods in Greek mythology?", answer: "Zeus" },
        { question: "What is the name of Thor's hammer in Norse mythology?", answer: "Mjölnir" },
        { question: "Who is the goddess of wisdom in Greek mythology?", answer: "Athena" },
        { question: "What creature has the body of a lion and the head of a human?", answer: "Sphinx" },
        { question: "Who is the god of the underworld in Greek mythology?", answer: "Hades" },
        { question: "What is the name of the one-eyed giant in Greek mythology?", answer: "Cyclops" },
        { question: "Who is the goddess of love in Roman mythology?", answer: "Venus" },
        { question: "What creature is half-man, half-horse?", answer: "Centaur" },
        { question: "Who is the messenger god in Greek mythology?", answer: "Hermes" },
        { question: "What is the name of the winged horse in Greek mythology?", answer: "Pegasus" },
        { question: "Who is the god of war in Greek mythology?", answer: "Ares" },
        { question: "What creature has the head of a bull and the body of a man?", answer: "Minotaur" },
        { question: "Who is the god of the sea in Greek mythology?", answer: "Poseidon" },
        { question: "What is the name of Odin's eight-legged horse?", answer: "Sleipnir" },
        { question: "Who is the goddess of the hunt in Greek mythology?", answer: "Artemis" },
        { question: "What creature turns people to stone with its gaze?", answer: "Medusa (or Gorgon)" },
        { question: "Who is the god of fire and metalworking in Greek mythology?", answer: "Hephaestus" },
        { question: "What is the name of the three-headed dog guarding the underworld?", answer: "Cerberus" },
        { question: "Who is the goddess of agriculture in Greek mythology?", answer: "Demeter" },
        { question: "What creature is a bird with a woman's face?", answer: "Harpy (or Siren)" },
        { question: "Who is the Norse god of mischief?", answer: "Loki" },
        { question: "What is the name of the Greek hero who killed Medusa?", answer: "Perseus" },
        { question: "Who is the Roman god of war?", answer: "Mars" },
        { question: "What creature rises from its own ashes?", answer: "Phoenix" },
        { question: "Who is the Greek hero known for his twelve labors?", answer: "Hercules (Heracles)" },
        { question: "What is the name of Zeus's wife?", answer: "Hera" },
        { question: "Who is the Egyptian god of the dead?", answer: "Anubis" },
        { question: "What creature is part lion, part goat, and part snake?", answer: "Chimera" },
        { question: "Who is the Greek goddess of the rainbow?", answer: "Iris" },
        { question: "What is the name of the Norse end of the world?", answer: "Ragnarök" },
        { question: "Who is the sun god in Egyptian mythology?", answer: "Ra" },
        { question: "What creature guards the Golden Fleece?", answer: "Dragon" },
        { question: "Who is the Greek god of wine?", answer: "Dionysus" },
        { question: "What is the name of King Arthur's sword?", answer: "Excalibur" },
        { question: "Who is the goddess of spring in Greek mythology?", answer: "Persephone" },
        { question: "What creature is half-woman, half-bird and lures sailors with song?", answer: "Siren" },
        { question: "Who is the Norse god of thunder?", answer: "Thor" },
        { question: "What is the name of the maze where the Minotaur lived?", answer: "Labyrinth" },
        { question: "Who opened a box releasing all evils into the world?", answer: "Pandora" },
        { question: "What is the name of the home of the gods in Norse mythology?", answer: "Asgard" }
      ],
      'Space & Astronomy': [
        { question: "What is the largest planet in our solar system?", answer: "Jupiter" },
        { question: "What is the closest planet to the Sun?", answer: "Mercury" },
        { question: "What galaxy is Earth located in?", answer: "The Milky Way" },
        { question: "What is the name of Earth's natural satellite?", answer: "The Moon" },
        { question: "What is the hottest planet in our solar system?", answer: "Venus" },
        { question: "What is the name of the first human to walk on the moon?", answer: "Neil Armstrong" },
        { question: "What is a group of stars forming a pattern called?", answer: "Constellation" },
        { question: "What planet is known as the 'Red Planet'?", answer: "Mars" },
        { question: "What is the name of the first artificial satellite launched into space?", answer: "Sputnik 1" },
        { question: "What is the largest moon of Saturn?", answer: "Titan" },
        { question: "What is the center of our solar system?", answer: "The Sun" },
        { question: "What planet has the most moons?", answer: "Saturn (or Jupiter)" },
        { question: "What is the name of the force that keeps planets in orbit?", answer: "Gravity" },
        { question: "What is the closest star to Earth besides the Sun?", answer: "Proxima Centauri" },
        { question: "What planet is famous for its rings?", answer: "Saturn" },
        { question: "What is the name of the telescope launched in 1990?", answer: "Hubble Space Telescope" },
        { question: "What is the smallest planet in our solar system?", answer: "Mercury" },
        { question: "What is the Great Red Spot on Jupiter?", answer: "A giant storm" },
        { question: "What is the name of the path a planet takes around the Sun?", answer: "Orbit" },
        { question: "What planet rotates on its side?", answer: "Uranus" },
        { question: "What is the name of the explosion that created the universe?", answer: "The Big Bang" },
        { question: "What is the term for a dying star that collapses?", answer: "Black hole (or supernova)" },
        { question: "What planet is farthest from the Sun?", answer: "Neptune" },
        { question: "What is the name of SpaceX's reusable rocket?", answer: "Falcon 9" },
        { question: "What is the name of the cloud of gas and dust where stars are born?", answer: "Nebula" },
        { question: "What year did humans first land on the moon?", answer: "1969" },
        { question: "What is the name of Mars' largest moon?", answer: "Phobos" },
        { question: "What is the brightest star in the night sky?", answer: "Sirius" },
        { question: "What is the name of the dwarf planet in our solar system?", answer: "Pluto" },
        { question: "What is the term for a rock from space that hits Earth?", answer: "Meteorite" },
        { question: "What is the International Space Station's abbreviation?", answer: "ISS" },
        { question: "What planet has the shortest day?", answer: "Jupiter" },
        { question: "What is the name of the belt of asteroids between Mars and Jupiter?", answer: "Asteroid Belt" },
        { question: "What is the temperature at the center of the Sun?", answer: "About 15 million degrees Celsius" },
        { question: "What is the name of Elon Musk's space company?", answer: "SpaceX" },
        { question: "What phenomenon causes day and night on Earth?", answer: "Earth's rotation" },
        { question: "What is the name of the galaxy closest to the Milky Way?", answer: "Andromeda" },
        { question: "What is a supernova?", answer: "An exploding star" },
        { question: "What is the name of the red supergiant star in Orion?", answer: "Betelgeuse" },
        { question: "How many planets are in our solar system?", answer: "8" }
      ],
      'Video Games': [
        { question: "What plumber is the mascot of Nintendo?", answer: "Mario" },
        { question: "What battle royale game features a 'Victory Royale'?", answer: "Fortnite" },
        { question: "What is the best-selling video game of all time?", answer: "Minecraft" },
        { question: "What game series features Master Chief?", answer: "Halo" },
        { question: "What company makes the PlayStation?", answer: "Sony" },
        { question: "What game features characters like Pikachu and Charizard?", answer: "Pokémon" },
        { question: "What game involves blocks and building?", answer: "Minecraft" },
        { question: "What game series features Link as the protagonist?", answer: "The Legend of Zelda" },
        { question: "What company makes the Xbox?", answer: "Microsoft" },
        { question: "What game features the character Sonic?", answer: "Sonic the Hedgehog" },
        { question: "What battle royale game is developed by Respawn Entertainment?", answer: "Apex Legends" },
        { question: "What game series features Kratos?", answer: "God of War" },
        { question: "What is the name of the popular soccer video game series?", answer: "FIFA (or EA Sports FC)" },
        { question: "What game features Steve as the default player?", answer: "Minecraft" },
        { question: "What company developed Fortnite?", answer: "Epic Games" },
        { question: "What game series features Lara Croft?", answer: "Tomb Raider" },
        { question: "What is Mario's brother's name?", answer: "Luigi" },
        { question: "What game features the character Pac-Man?", answer: "Pac-Man" },
        { question: "What is the currency called in Fortnite?", answer: "V-Bucks" },
        { question: "What game series features Nathan Drake?", answer: "Uncharted" },
        { question: "What game involves catching creatures in balls?", answer: "Pokémon" },
        { question: "What game series features the Covenant and UNSC?", answer: "Halo" },
        { question: "What is the name of Link's horse in Zelda?", answer: "Epona" },
        { question: "What game features a post-apocalyptic wasteland?", answer: "Fallout" },
        { question: "What company developed The Last of Us?", answer: "Naughty Dog" },
        { question: "What game features the character Samus Aran?", answer: "Metroid" },
        { question: "What is the princess's name in Mario games?", answer: "Princess Peach" },
        { question: "What game series features Cloud Strife?", answer: "Final Fantasy" },
        { question: "What game features the character Geralt of Rivia?", answer: "The Witcher" },
        { question: "What is the name of the battle royale mode in Call of Duty?", answer: "Warzone" },
        { question: "What game features building and survival on an island?", answer: "ARK: Survival Evolved (or Minecraft)" },
        { question: "What is Nintendo's handheld console called?", answer: "Nintendo Switch" },
        { question: "What game series features Joel and Ellie?", answer: "The Last of Us" },
        { question: "What game features the character Donkey Kong?", answer: "Donkey Kong" },
        { question: "What is the main character's name in Half-Life?", answer: "Gordon Freeman" },
        { question: "What game features racing with characters like Mario and Luigi?", answer: "Mario Kart" },
        { question: "What game company created Overwatch?", answer: "Blizzard Entertainment" },
        { question: "What game features the phrase 'The cake is a lie'?", answer: "Portal" },
        { question: "What is the highest-grossing arcade game of all time?", answer: "Pac-Man" },
        { question: "What game series features Solid Snake?", answer: "Metal Gear" }
      ],
      'Fashion': [
        { question: "What French fashion house has a double C logo?", answer: "Chanel" },
        { question: "Who is known as the 'Queen of Fashion'?", answer: "Anna Wintour" },
        { question: "What is the name of the fashion magazine with a one-word title?", answer: "Vogue" },
        { question: "What Italian brand is known for its red-soled shoes?", answer: "Christian Louboutin" },
        { question: "What is Coco Chanel's first name?", answer: "Gabrielle" },
        { question: "What fashion event happens twice a year in Paris, Milan, New York, and London?", answer: "Fashion Week" },
        { question: "What is the name of the little black dress popularized by Chanel?", answer: "LBD (Little Black Dress)" },
        { question: "What Italian brand uses the Medusa head as its logo?", answer: "Versace" },
        { question: "What is the term for high-end, custom-fitted clothing?", answer: "Haute couture" },
        { question: "What designer is known for the red sole on shoes?", answer: "Christian Louboutin" },
        { question: "What is Rihanna's fashion brand called?", answer: "Fenty" },
        { question: "What French brand is known for its interlocking G logo?", answer: "Gucci" },
        { question: "What is the name of Karl Lagerfeld's cat?", answer: "Choupette" },
        { question: "What material are Levi's jeans traditionally made from?", answer: "Denim" },
        { question: "What is the fashion capital of the world?", answer: "Paris" },
        { question: "What brand is known for its polo player logo?", answer: "Ralph Lauren" },
        { question: "What is the term for ready-to-wear clothing?", answer: "Pr��t-à-porter" },
        { question: "What designer founded his own fashion house in 1946?", answer: "Christian Dior" },
        { question: "What is Kim Kardashian's shapewear brand called?", answer: "SKIMS" },
        { question: "What brand is known for its checkered pattern?", answer: "Burberry" },
        { question: "What is the name of the annual fashion gala in New York?", answer: "The Met Gala" },
        { question: "What Italian brand uses a horse and chariot logo?", answer: "Hermès" },
        { question: "What is Alexander McQueen's nickname?", answer: "The King of Fashion (or McQueen)" },
        { question: "What brand is known for its orange boxes?", answer: "Hermès" },
        { question: "What is the term for a fashion show's walkway?", answer: "Runway (or catwalk)" },
        { question: "What designer is known for wrap dresses?", answer: "Diane von Fürstenberg" },
        { question: "What is the name of Kanye West's fashion line?", answer: "Yeezy" },
        { question: "What brand uses three stripes as its logo?", answer: "Adidas" },
        { question: "What is the term for vintage or second-hand fashion?", answer: "Thrift (or vintage)" },
        { question: "What designer created the tuxedo for women?", answer: "Yves Saint Laurent" },
        { question: "What brand is known for its swoosh logo?", answer: "Nike" },
        { question: "What is the name of Victoria Beckham's fashion line?", answer: "Victoria Beckham" },
        { question: "What Italian brand is known for its green-red-green stripe?", answer: "Gucci" },
        { question: "What is the term for a fashion trend that comes back?", answer: "Revival (or comeback)" },
        { question: "What designer is known for punk and grunge fashion?", answer: "Vivienne Westwood" },
        { question: "What brand collaborates with Supreme?", answer: "Louis Vuitton (and others)" },
        { question: "What is the name of Beyoncé's athleisure line?", answer: "Ivy Park" },
        { question: "What brand is known for its monogram canvas?", answer: "Louis Vuitton" },
        { question: "What is the term for clothing that doesn't conform to gender norms?", answer: "Gender-neutral (or unisex)" },
        { question: "What designer is known for his avant-garde designs?", answer: "Rei Kawakubo (or many others)" }
      ],
      'Architecture': [
        { question: "Who designed the Eiffel Tower?", answer: "Gustave Eiffel" },
        { question: "What is the tallest building in the world?", answer: "Burj Khalifa" },
        { question: "What architectural style features pointed arches and flying buttresses?", answer: "Gothic" },
        { question: "What famous building in India is a mausoleum?", answer: "Taj Mahal" },
        { question: "Who designed the Guggenheim Museum in New York?", answer: "Frank Lloyd Wright" },
        { question: "What is the name of the ancient Roman arena?", answer: "The Colosseum" },
        { question: "What city is home to the Sagrada Família?", answer: "Barcelona" },
        { question: "Who is the architect of the Sagrada Família?", answer: "Antoni Gaudí" },
        { question: "What is the term for the triangular upper part of a building's front?", answer: "Pediment" },
        { question: "What famous opera house is in Sydney?", answer: "Sydney Opera House" },
        { question: "What architectural style is characterized by ornate details and gold?", answer: "Baroque" },
        { question: "What is the name of the ancient Greek temple dedicated to Athena?", answer: "Parthenon" },
        { question: "Who designed the Louvre Pyramid?", answer: "I.M. Pei" },
        { question: "What is the leaning tower in Italy called?", answer: "Leaning Tower of Pisa" },
        { question: "What architectural movement emphasizes function over form?", answer: "Modernism (or Functionalism)" },
        { question: "What is the name of Frank Lloyd Wright's famous waterfall house?", answer: "Fallingwater" },
        { question: "What palace is the official residence of the French president?", answer: "Élysée Palace" },
        { question: "What is a flying buttress?", answer: "An external support arch" },
        { question: "What city is home to the Burj Khalifa?", answer: "Dubai" },
        { question: "Who designed the Glass House in Connecticut?", answer: "Philip Johnson" },
        { question: "What is the name of the dome on top of a building?", answer: "Cupola" },
        { question: "What architectural style is the White House?", answer: "Neoclassical" },
        { question: "What is the name of the palace in Versailles?", answer: "Palace of Versailles" },
        { question: "Who designed the Villa Savoye?", answer: "Le Corbusier" },
        { question: "What is the name of the ornamental column style with scrolls?", answer: "Ionic" },
        { question: "What city is known as the birthplace of the skyscraper?", answer: "Chicago" },
        { question: "What is the name of the arch in St. Louis?", answer: "Gateway Arch" },
        { question: "Who designed the Barcelona Pavilion?", answer: "Mies van der Rohe" },
        { question: "What is the term for a covered walkway with columns?", answer: "Colonnade" },
        { question: "What famous mosque is in Istanbul?", answer: "Hagia Sophia (or Blue Mosque)" },
        { question: "What is the name of the bridge connecting San Francisco to Marin County?", answer: "Golden Gate Bridge" },
        { question: "Who designed the Farnsworth House?", answer: "Mies van der Rohe" },
        { question: "What is the term for a building's main entrance?", answer: "Portal (or entrance)" },
        { question: "What architectural style features clean lines and minimal ornamentation?", answer: "Minimalism (or Modernism)" },
        { question: "What is the name of the palace in Granada, Spain?", answer: "Alhambra" },
        { question: "Who designed the Seagram Building?", answer: "Mies van der Rohe" },
        { question: "What is the term for a rounded roof or ceiling?", answer: "Dome (or vault)" },
        { question: "What city is home to the Chrysler Building?", answer: "New York City" },
        { question: "What is the name of the ancient wonder in Egypt?", answer: "Great Pyramid of Giza" },
        { question: "Who designed the Centre Pompidou in Paris?", answer: "Renzo Piano and Richard Rogers" }
      ],
      'World Leaders': [
        { question: "Who was the first president of the United States?", answer: "George Washington" },
        { question: "Who is the current president of the United States?", answer: "Joe Biden" },
        { question: "Who was the prime minister of the UK during World War II?", answer: "Winston Churchill" },
        { question: "Who was the first female prime minister of the UK?", answer: "Margaret Thatcher" },
        { question: "Who led the Soviet Union during the Cold War?", answer: "Joseph Stalin (and others)" },
        { question: "Who was the first Black president of South Africa?", answer: "Nelson Mandela" },
        { question: "Who led India to independence from British rule?", answer: "Mahatma Gandhi" },
        { question: "Who was the longest-reigning British monarch?", answer: "Queen Elizabeth II" },
        { question: "Who is the current pope?", answer: "Pope Francis" },
        { question: "Who was the leader of Nazi Germany?", answer: "Adolf Hitler" },
        { question: "Who is the current prime minister of the UK?", answer: "Rishi Sunak" },
        { question: "Who was the first emperor of France?", answer: "Napoleon Bonaparte" },
        { question: "Who led Cuba for nearly 50 years?", answer: "Fidel Castro" },
        { question: "Who was the first female chancellor of Germany?", answer: "Angela Merkel" },
        { question: "Who is the current president of France?", answer: "Emmanuel Macron" },
        { question: "Who was the leader of China during the Cultural Revolution?", answer: "Mao Zedong" },
        { question: "Who was the youngest U.S. president ever elected?", answer: "John F. Kennedy" },
        { question: "Who led Egypt from 1981 to 2011?", answer: "Hosni Mubarak" },
        { question: "Who is the current president of Russia?", answer: "Vladimir Putin" },
        { question: "Who was the first prime minister of India?", answer: "Jawaharlal Nehru" },
        { question: "Who was the president of the U.S. during the Civil War?", answer: "Abraham Lincoln" },
        { question: "Who is the supreme leader of North Korea?", answer: "Kim Jong Un" },
        { question: "Who was the Iron Lady?", answer: "Margaret Thatcher" },
        { question: "Who led the Mongol Empire?", answer: "Genghis Khan" },
        { question: "Who was the first female president of a country?", answer: "Isabel Perón (Argentina)" },
        { question: "Who is the current prime minister of Canada?", answer: "Justin Trudeau" },
        { question: "Who was the last pharaoh of Egypt?", answer: "Cleopatra" },
        { question: "Who led the American Revolution?", answer: "George Washington" },
        { question: "Who was the president of the U.S. during World War II?", answer: "Franklin D. Roosevelt" },
        { question: "Who is the current chancellor of Germany?", answer: "Olaf Scholz" },
        { question: "Who was the first Roman emperor?", answer: "Augustus" },
        { question: "Who led Venezuela from 1999 to 2013?", answer: "Hugo Chávez" },
        { question: "Who was the president of the U.S. during the Great Depression?", answer: "Herbert Hoover (then FDR)" },
        { question: "Who is the current president of China?", answer: "Xi Jinping" },
        { question: "Who was the queen of England during the Spanish Armada?", answer: "Elizabeth I" },
        { question: "Who led Brazil from 2003 to 2011?", answer: "Luiz Inácio Lula da Silva" },
        { question: "Who was the president during Watergate?", answer: "Richard Nixon" },
        { question: "Who is the current prime minister of Japan?", answer: "Fumio Kishida" },
        { question: "Who was the czar of Russia during World War I?", answer: "Nicholas II" },
        { question: "Who was the first democratically elected president of Russia?", answer: "Boris Yeltsin" }
      ],
      'Languages': [
        { question: "What is the most spoken language in the world?", answer: "Mandarin Chinese (or English)" },
        { question: "What language is spoken in Brazil?", answer: "Portuguese" },
        { question: "What is the official language of Egypt?", answer: "Arabic" },
        { question: "What language uses the Cyrillic alphabet?", answer: "Russian (and others)" },
        { question: "What is the term for a language with no native speakers?", answer: "Dead language" },
        { question: "What language is Latin the ancestor of?", answer: "Romance languages" },
        { question: "What is the official language of Israel?", answer: "Hebrew" },
        { question: "What language family does English belong to?", answer: "Germanic" },
        { question: "What is the most widely spoken Romance language?", answer: "Spanish" },
        { question: "What language is spoken in the Netherlands?", answer: "Dutch" },
        { question: "What is the official language of Austria?", answer: "German" },
        { question: "What writing system does Japanese use?", answer: "Kanji, Hiragana, and Katakana" },
        { question: "What is the term for a person who speaks two languages?", answer: "Bilingual" },
        { question: "What language is Swahili?", answer: "A Bantu language" },
        { question: "What is the official language of Iran?", answer: "Persian (Farsi)" },
        { question: "What language uses the Arabic script?", answer: "Arabic (and others)" },
        { question: "What is the most spoken language in Europe?", answer: "Russian (or German)" },
        { question: "What language is spoken in Quebec?", answer: "French" },
        { question: "What is the official language of Pakistan?", answer: "Urdu" },
        { question: "What language family does Hindi belong to?", answer: "Indo-Aryan" },
        { question: "What is the term for a language that develops from mixing languages?", answer: "Creole" },
        { question: "What language is spoken in Greece?", answer: "Greek" },
        { question: "What is the official language of Argentina?", answer: "Spanish" },
        { question: "What language uses tones to distinguish meaning?", answer: "Mandarin Chinese (or tonal languages)" },
        { question: "What is the most spoken language in Africa?", answer: "Arabic (or Swahili)" },
        { question: "What language is Latin derived from?", answer: "Proto-Italic" },
        { question: "What is the official language of Belgium?", answer: "Dutch, French, and German" },
        { question: "What language is spoken in Poland?", answer: "Polish" },
        { question: "What is the term for words that sound the same but have different meanings?", answer: "Homophones" },
        { question: "What language is spoken in Vietnam?", answer: "Vietnamese" },
        { question: "What is the official language of Switzerland?", answer: "German, French, Italian, and Romansh" },
        { question: "What language family does Arabic belong to?", answer: "Semitic" },
        { question: "What is the most spoken language in South America?", answer: "Spanish (or Portuguese)" },
        { question: "What language is spoken in Thailand?", answer: "Thai" },
        { question: "What is the term for a universal language created for communication?", answer: "Constructed language (or Esperanto)" },
        { question: "What language is spoken in Turkey?", answer: "Turkish" },
        { question: "What is the official language of the Philippines?", answer: "Filipino (and English)" },
        { question: "What language family does Finnish belong to?", answer: "Uralic" },
        { question: "What is the most spoken language in India?", answer: "Hindi" },
        { question: "What language is spoken in Norway?", answer: "Norwegian" }
      ],
      'Philosophy': [
        { question: "Who is known as the father of Western philosophy?", answer: "Socrates" },
        { question: "Who wrote 'The Republic'?", answer: "Plato" },
        { question: "What is the study of knowledge called?", answer: "Epistemology" },
        { question: "Who said 'I think, therefore I am'?", answer: "René Descartes" },
        { question: "What is the study of right and wrong called?", answer: "Ethics" },
        { question: "Who was Plato's famous student?", answer: "Aristotle" },
        { question: "What philosophy emphasizes living in accordance with nature?", answer: "Stoicism" },
        { question: "Who wrote 'Thus Spoke Zarathustra'?", answer: "Friedrich Nietzsche" },
        { question: "What is the belief that nothing can be known with certainty?", answer: "Skepticism" },
        { question: "Who is the founder of Stoicism?", answer: "Zeno of Citium" },
        { question: "What is the study of existence called?", answer: "Ontology" },
        { question: "Who wrote 'Meditations'?", answer: "Marcus Aurelius" },
        { question: "What philosophy emphasizes individual freedom and choice?", answer: "Existentialism" },
        { question: "Who said 'God is dead'?", answer: "Friedrich Nietzsche" },
        { question: "What is the belief that pleasure is the highest good?", answer: "Hedonism" },
        { question: "Who wrote 'The Communist Manifesto'?", answer: "Karl Marx (and Friedrich Engels)" },
        { question: "What is the study of beauty and art called?", answer: "Aesthetics" },
        { question: "Who is known for the categorical imperative?", answer: "Immanuel Kant" },
        { question: "What philosophy emphasizes the absurdity of life?", answer: "Absurdism" },
        { question: "Who wrote 'Being and Nothingness'?", answer: "Jean-Paul Sartre" },
        { question: "What is the belief that only matter exists?", answer: "Materialism" },
        { question: "Who is known for the concept of the 'Übermensch'?", answer: "Friedrich Nietzsche" },
        { question: "What is the study of logic called?", answer: "Logic" },
        { question: "Who wrote 'Critique of Pure Reason'?", answer: "Immanuel Kant" },
        { question: "What philosophy emphasizes living simply?", answer: "Cynicism (or Minimalism)" },
        { question: "Who is known for utilitarianism?", answer: "John Stuart Mill (or Jeremy Bentham)" },
        { question: "What is the belief that reality is fundamentally mental?", answer: "Idealism" },
        { question: "Who wrote 'The Prince'?", answer: "Niccolò Machiavelli" },
        { question: "What is the paradox where a ship's parts are replaced?", answer: "Ship of Theseus" },
        { question: "Who is known for the concept of the 'will to power'?", answer: "Friedrich Nietzsche" },
        { question: "What is the belief that knowledge comes from experience?", answer: "Empiricism" },
        { question: "Who wrote 'Leviathan'?", answer: "Thomas Hobbes" },
        { question: "What is the belief that knowledge comes from reason?", answer: "Rationalism" },
        { question: "Who is known for the allegory of the cave?", answer: "Plato" },
        { question: "What is the study of arguments called?", answer: "Logic" },
        { question: "Who wrote 'The Social Contract'?", answer: "Jean-Jacques Rousseau" },
        { question: "What is the belief that truth is relative?", answer: "Relativism" },
        { question: "Who is known for pragmatism?", answer: "William James (or John Dewey)" },
        { question: "What is the greatest happiness principle?", answer: "Utilitarianism" },
        { question: "Who wrote 'Ethics'?", answer: "Baruch Spinoza" }
      ],
      'Inventions': [
        { question: "Who invented the telephone?", answer: "Alexander Graham Bell" },
        { question: "Who invented the light bulb?", answer: "Thomas Edison" },
        { question: "What did Johannes Gutenberg invent?", answer: "Printing press" },
        { question: "Who invented the airplane?", answer: "Wright Brothers" },
        { question: "What did Alexander Fleming discover?", answer: "Penicillin" },
        { question: "Who invented the World Wide Web?", answer: "Tim Berners-Lee" },
        { question: "What did Eli Whitney invent?", answer: "Cotton gin" },
        { question: "Who invented the radio?", answer: "Guglielmo Marconi" },
        { question: "What did James Watt improve?", answer: "Steam engine" },
        { question: "Who invented the phonograph?", answer: "Thomas Edison" },
        { question: "What did Benjamin Franklin invent?", answer: "Lightning rod (and bifocals)" },
        { question: "Who invented the first mechanical computer?", answer: "Charles Babbage" },
        { question: "What did Louis Pasteur develop?", answer: "Pasteurization" },
        { question: "Who invented dynamite?", answer: "Alfred Nobel" },
        { question: "What did the Wright Brothers invent?", answer: "Airplane" },
        { question: "Who invented the telescope?", answer: "Hans Lippershey (or Galileo)" },
        { question: "What did George Eastman invent?", answer: "Kodak camera" },
        { question: "Who invented the sewing machine?", answer: "Elias Howe" },
        { question: "What did Samuel Morse invent?", answer: "Telegraph (and Morse code)" },
        { question: "Who invented the thermometer?", answer: "Galileo Galilei" },
        { question: "What did John Logie Baird invent?", answer: "Television" },
        { question: "Who invented the revolver?", answer: "Samuel Colt" },
        { question: "What did Louis Braille invent?", answer: "Braille system" },
        { question: "Who invented the microwave oven?", answer: "Percy Spencer" },
        { question: "What did Johannes Kepler discover?", answer: "Laws of planetary motion" },
        { question: "Who invented the barcode?", answer: "Norman Joseph Woodland" },
        { question: "What did Willis Carrier invent?", answer: "Air conditioning" },
        { question: "Who invented the zipper?", answer: "Gideon Sundback" },
        { question: "What did Levi Strauss invent?", answer: "Blue jeans" },
        { question: "Who invented the ballpoint pen?", answer: "László Bíró" },
        { question: "What did Nikola Tesla invent?", answer: "AC motor (and many others)" },
        { question: "Who invented the safety pin?", answer: "Walter Hunt" },
        { question: "What did Tim Berners-Lee invent?", answer: "World Wide Web" },
        { question: "Who invented the stethoscope?", answer: "René Laënnec" },
        { question: "What did Robert Fulton invent?", answer: "Steamboat" },
        { question: "Who invented the Post-it Note?", answer: "Spencer Silver (and Art Fry)" },
        { question: "What did John Pemberton invent?", answer: "Coca-Cola" },
        { question: "Who invented the mechanical clock?", answer: "Medieval Europe (no single inventor)" },
        { question: "What did George de Mestral invent?", answer: "Velcro" },
        { question: "Who invented the vacuum cleaner?", answer: "Hubert Cecil Booth" }
      ],
      'Nature': [
        { question: "What is the largest ocean on Earth?", answer: "Pacific Ocean" },
        { question: "What is the tallest type of tree?", answer: "Redwood (or Sequoia)" },
        { question: "What is the largest rainforest in the world?", answer: "Amazon Rainforest" },
        { question: "What is the longest river in the world?", answer: "The Nile" },
        { question: "What is the largest desert in the world?", answer: "Antarctic Desert (or Sahara)" },
        { question: "What is the deepest part of the ocean?", answer: "Mariana Trench" },
        { question: "What is the most abundant gas in Earth's atmosphere?", answer: "Nitrogen" },
        { question: "What is the name of molten rock beneath Earth's surface?", answer: "Magma" },
        { question: "What is the process of water turning into vapor called?", answer: "Evaporation" },
        { question: "What is the largest coral reef system?", answer: "Great Barrier Reef" },
        { question: "What is the layer of gas that protects Earth from radiation?", answer: "Ozone layer" },
        { question: "What is the term for animals that are active at night?", answer: "Nocturnal" },
        { question: "What is the largest volcano in the world?", answer: "Mauna Loa" },
        { question: "What is the process by which plants release water?", answer: "Transpiration" },
        { question: "What is a group of wolves called?", answer: "A pack" },
        { question: "What is the term for the seasonal movement of animals?", answer: "Migration" },
        { question: "What is the highest waterfall in the world?", answer: "Angel Falls" },
        { question: "What is the term for a symbiotic relationship where both benefit?", answer: "Mutualism" },
        { question: "What is the largest bay in the world?", answer: "Hudson Bay (or Bay of Bengal)" },
        { question: "What is the term for plants that grow in water?", answer: "Aquatic plants" },
        { question: "What is the name of the line that divides Earth into hemispheres?", answer: "Equator" },
        { question: "What is the term for an area with little rainfall?", answer: "Arid (or desert)" },
        { question: "What is the largest lake in the world by surface area?", answer: "Caspian Sea" },
        { question: "What is the term for animals that eat only plants?", answer: "Herbivores" },
        { question: "What is the name of the supercontinent that existed millions of years ago?", answer: "Pangaea" },
        { question: "What is the term for the variety of life in an ecosystem?", answer: "Biodiversity" },
        { question: "What is the largest island in the world?", answer: "Greenland" },
        { question: "What is the term for rocks formed by cooling lava?", answer: "Igneous rocks" },
        { question: "What is the process by which soil is worn away?", answer: "Erosion" },
        { question: "What is the term for animals that eat both plants and meat?", answer: "Omnivores" },
        { question: "What is the highest mountain range in the world?", answer: "The Himalayas" },
        { question: "What is the term for the study of Earth's atmosphere?", answer: "Meteorology" },
        { question: "What is a baby frog called?", answer: "Tadpole" },
        { question: "What is the term for the shaking of Earth's surface?", answer: "Earthquake" },
        { question: "What is the largest peninsula in the world?", answer: "Arabian Peninsula" },
        { question: "What is the term for a mountain that erupts?", answer: "Volcano" },
        { question: "What is the process by which plants make oxygen?", answer: "Photosynthesis" },
        { question: "What is a group of whales called?", answer: "A pod" },
        { question: "What is the term for frozen precipitation?", answer: "Snow (or hail)" },
        { question: "What is the study of plants called?", answer: "Botany" }
      ],
      'Board Games & Puzzles': [
        { question: "What board game involves buying properties?", answer: "Monopoly" },
        { question: "What is the highest-scoring letter in Scrabble?", answer: "Q or Z" },
        { question: "What board game has a king that must be protected?", answer: "Chess" },
        { question: "What puzzle has 9 rows and 9 columns with numbers 1-9?", answer: "Sudoku" },
        { question: "What board game involves connecting four pieces in a row?", answer: "Connect Four" },
        { question: "What is the most powerful piece in chess?", answer: "Queen" },
        { question: "What board game involves world domination?", answer: "Risk" },
        { question: "What puzzle involves assembling interlocking pieces?", answer: "Jigsaw puzzle" },
        { question: "What board game has cards labeled 'Chance' and 'Community Chest'?", answer: "Monopoly" },
        { question: "What strategy board game originated in ancient China?", answer: "Go" },
        { question: "What board game involves solving a murder mystery?", answer: "Clue (or Cluedo)" },
        { question: "What is the term for a chess move where the king and rook swap?", answer: "Castling" },
        { question: "What board game involves colored pegs and code-breaking?", answer: "Mastermind" },
        { question: "What puzzle involves twisting colored squares?", answer: "Rubik's Cube" },
        { question: "What board game has spaces for Park Place and Boardwalk?", answer: "Monopoly" },
        { question: "What card game involves drawing and discarding to form sets?", answer: "Rummy" },
        { question: "What board game involves building settlements and roads?", answer: "Catan (Settlers of Catan)" },
        { question: "What is checkmate in chess?", answer: "When the king cannot escape capture" },
        { question: "What board game involves a spinner and colored circles?", answer: "Twister" },
        { question: "What puzzle involves filling in a grid based on number clues?", answer: "Crossword puzzle" },
        { question: "What board game involves removing wooden blocks from a tower?", answer: "Jenga" },
        { question: "What card game is also called '21'?", answer: "Blackjack" },
        { question: "What board game involves apologizing when bumping opponents?", answer: "Sorry!" },
        { question: "What is the opening move in chess where a pawn moves two spaces?", answer: "Pawn advance" },
        { question: "What board game involves spelling words for points?", answer: "Scrabble" },
        { question: "What puzzle involves logic and deduction with a grid?", answer: "Logic puzzle" },
        { question: "What board game involves a race to get all pieces home?", answer: "Parcheesi (or Ludo)" },
        { question: "What card game involves matching pairs?", answer: "Memory (or Concentration)" },
        { question: "What board game involves battleships and coordinates?", answer: "Battleship" },
        { question: "What is en passant in chess?", answer: "A special pawn capture" },
        { question: "What board game involves collecting sets of cards?", answer: "Ticket to Ride" },
        { question: "What puzzle has a 3x3 grid you solve by sliding tiles?", answer: "Sliding puzzle (or 15-puzzle)" },
        { question: "What board game involves bidding on properties?", answer: "Monopoly" },
        { question: "What card game involves shouting 'UNO'?", answer: "UNO" },
        { question: "What board game involves a journey through life?", answer: "The Game of Life" },
        { question: "What is stalemate in chess?", answer: "When a player cannot make a legal move but isn't in check" },
        { question: "What board game involves placing tiles to create a landscape?", answer: "Carcassonne" },
        { question: "What puzzle involves finding words in a grid?", answer: "Word search" },
        { question: "What board game involves Operation Cavity Sam?", answer: "Operation" },
        { question: "What is the term for when a pawn reaches the other side in chess?", answer: "Promotion" }
      ],
      'UX Design': [
        { question: "What does UX stand for?", answer: "User Experience" },
        { question: "What is a wireframe?", answer: "A basic visual guide showing the structure of a page" },
        { question: "What is the name of a clickable model of a design?", answer: "Prototype" },
        { question: "What is usability testing?", answer: "Testing a product with real users" },
        { question: "What does UI stand for?", answer: "User Interface" },
        { question: "What is a persona in UX design?", answer: "A fictional representation of a target user" },
        { question: "What is the process of organizing content called?", answer: "Information Architecture" },
        { question: "What tool is commonly used for creating prototypes?", answer: "Figma (or Sketch, Adobe XD)" },
        { question: "What is A/B testing?", answer: "Comparing two versions to see which performs better" },
        { question: "What principle states users spend most time on other sites?", answer: "Jakob's Law" },
        { question: "What is a user flow?", answer: "The path a user takes through an application" },
        { question: "What does WCAG stand for?", answer: "Web Content Accessibility Guidelines" },
        { question: "What is the measure of how easy a product is to use?", answer: "Usability" },
        { question: "What is a heuristic evaluation?", answer: "An expert review of a design against usability principles" },
        { question: "What law states the time to acquire a target depends on distance and size?", answer: "Fitts's Law" },
        { question: "What is card sorting used for?", answer: "Understanding how users categorize information" },
        { question: "What is the term for making products accessible to all users?", answer: "Inclusive design (or Universal design)" },
        { question: "What is Design Thinking?", answer: "A human-centered approach to innovation and problem solving" },
        { question: "What is a user journey map?", answer: "A visualization of a user's experience over time" },
        { question: "What principle states items grouped together are perceived as related?", answer: "Law of Proximity (or Gestalt principle)" },
        { question: "What is the 80/20 rule in design?", answer: "Pareto Principle (80% of effects come from 20% of causes)" },
        { question: "What is the minimum recommended contrast ratio for text?", answer: "4.5:1" },
        { question: "What is a design system?", answer: "A collection of reusable components and guidelines" },
        { question: "What is the Nielsen Norman Group famous for?", answer: "UX research and usability heuristics" },
        { question: "What is progressive disclosure?", answer: "Revealing information gradually to avoid overwhelming users" },
        { question: "What is a mental model?", answer: "A user's understanding of how something works" },
        { question: "What technique involves thinking out loud while using a product?", answer: "Think-aloud protocol" },
        { question: "What is the F-pattern in web design?", answer: "How users typically scan web content" },
        { question: "What is affordance in design?", answer: "Visual clues that suggest how to interact with something" },
        { question: "What is the serial position effect?", answer: "Users remember the first and last items better" },
        { question: "What is the Gestalt principle of closure?", answer: "We mentally complete incomplete shapes" },
        { question: "What is a high-fidelity prototype?", answer: "A detailed, interactive representation close to the final design" },
        { question: "What methodology involves quick cycles of design, test, and refine?", answer: "Agile (or Lean UX)" },
        { question: "What is the goal of contextual inquiry?", answer: "Observing users in their natural environment" },
        { question: "What is Hick's Law?", answer: "The time to decide increases with number of choices" },
        { question: "What is the Von Restorff effect?", answer: "Items that stand out are more memorable" },
        { question: "What is microcopy?", answer: "Small pieces of text that guide users" },
        { question: "What does ARIA stand for in accessibility?", answer: "Accessible Rich Internet Applications" },
        { question: "What is the peak-end rule?", answer: "Users judge experiences by their peak and ending moments" },
        { question: "What is cognitive load?", answer: "The mental effort required to use a product" }
      ],
      'Design': [
        { question: "What does RGB stand for in color?", answer: "Red, Green, Blue" },
        { question: "What is the most widely used font on the web?", answer: "Arial (or Helvetica)" },
        { question: "What is a sans-serif font?", answer: "A font without decorative strokes at the ends" },
        { question: "What color model is used for printing?", answer: "CMYK" },
        { question: "Who designed the iconic Coca-Cola logo?", answer: "Frank Mason Robinson" },
        { question: "What is kerning in typography?", answer: "The spacing between individual letters" },
        { question: "What design style emphasizes minimal elements and simplicity?", answer: "Minimalism" },
        { question: "What is the golden ratio in design?", answer: "1.618 (or phi)" },
        { question: "What does CMYK stand for?", answer: "Cyan, Magenta, Yellow, Key (Black)" },
        { question: "What is a serif font?", answer: "A font with decorative strokes at the ends" },
        { question: "What is negative space in design?", answer: "Empty space around and between elements" },
        { question: "What Swiss designer created the iconic I ❤ NY logo?", answer: "Milton Glaser" },
        { question: "What is the rule of thirds in design?", answer: "Dividing a design into thirds horizontally and vertically" },
        { question: "What is tracking in typography?", answer: "The spacing between all letters in a word or line" },
        { question: "What color is created by mixing red and blue?", answer: "Purple (or violet)" },
        { question: "What is a monospaced font?", answer: "A font where each character has the same width" },
        { question: "What design movement featured geometric shapes and primary colors?", answer: "Bauhaus (or De Stijl)" },
        { question: "What is leading in typography?", answer: "The vertical spacing between lines of text" },
        { question: "What Swiss typeface is one of the most used in the world?", answer: "Helvetica" },
        { question: "What is a mood board?", answer: "A visual collection of ideas and inspiration" },
        { question: "What colors are complementary to each other on the color wheel?", answer: "Colors opposite each other" },
        { question: "What is the Pantone Matching System?", answer: "A standardized color reproduction system" },
        { question: "What is hierarchy in design?", answer: "The arrangement of elements to show importance" },
        { question: "What designer created the Apple logo?", answer: "Rob Janoff" },
        { question: "What is a grid system in design?", answer: "A structure of intersecting lines for organizing content" },
        { question: "What is contrast in design?", answer: "The difference between design elements" },
        { question: "What is whitespace?", answer: "Empty or unmarked space in a design" },
        { question: "What design school was founded in Germany in 1919?", answer: "Bauhaus" },
        { question: "What is a vector graphic?", answer: "An image made of mathematical paths rather than pixels" },
        { question: "What is rasterization?", answer: "Converting vector graphics to pixels" },
        { question: "What is the primary color triad?", answer: "Red, yellow, and blue" },
        { question: "What does DPI stand for?", answer: "Dots Per Inch" },
        { question: "What is balance in design?", answer: "The distribution of visual weight" },
        { question: "What font was designed specifically for dyslexic readers?", answer: "Dyslexie (or OpenDyslexic)" },
        { question: "What is a swatch in design?", answer: "A sample of color or pattern" },
        { question: "What is symmetry in design?", answer: "Mirror-like repetition on either side of a line" },
        { question: "What design principle involves repeating elements?", answer: "Repetition (or pattern)" },
        { question: "What is the Gestalt principle of similarity?", answer: "Similar elements are perceived as related" },
        { question: "What is an ampersand?", answer: "The & symbol" },
        { question: "What is a color palette?", answer: "A set of colors used in a design" }
      ],
      'Mathematics': [
        { question: "What is the value of pi to two decimal places?", answer: "3.14" },
        { question: "What is the square root of 144?", answer: "12" },
        { question: "What is 7 x 8?", answer: "56" },
        { question: "What is the name of a triangle with all equal sides?", answer: "Equilateral triangle" },
        { question: "What is the result of 100 divided by 4?", answer: "25" },
        { question: "What is a polygon with six sides called?", answer: "Hexagon" },
        { question: "Who is known as the father of geometry?", answer: "Euclid" },
        { question: "What is 15% of 200?", answer: "30" },
        { question: "What is the sum of the angles in a triangle?", answer: "180 degrees" },
        { question: "What is the Pythagorean theorem?", answer: "a² + b² = c²" },
        { question: "What is a number divisible only by 1 and itself called?", answer: "Prime number" },
        { question: "What is the area of a circle formula?", answer: "πr²" },
        { question: "What is 2 to the power of 5?", answer: "32" },
        { question: "What is the Roman numeral for 50?", answer: "L" },
        { question: "What mathematician is famous for his last theorem?", answer: "Pierre de Fermat" },
        { question: "What is the perimeter of a rectangle with length 5 and width 3?", answer: "16" },
        { question: "What is the next number in the Fibonacci sequence: 0, 1, 1, 2, 3, 5...?", answer: "8" },
        { question: "What is 12 squared?", answer: "144" },
        { question: "What is a polygon with eight sides called?", answer: "Octagon" },
        { question: "What is the value of e (Euler's number) to two decimal places?", answer: "2.71" },
        { question: "What is the formula for the volume of a sphere?", answer: "4/3πr³" },
        { question: "What is the reciprocal of 5?", answer: "1/5 (or 0.2)" },
        { question: "Who discovered calculus?", answer: "Isaac Newton (and Leibniz)" },
        { question: "What is the median of 3, 7, 9, 11, 15?", answer: "9" },
        { question: "What is a quadrilateral with opposite sides parallel?", answer: "Parallelogram" },
        { question: "What is the cube root of 27?", answer: "3" },
        { question: "What is the name of a line that touches a circle at one point?", answer: "Tangent" },
        { question: "What is 0 factorial (0!)?", answer: "1" },
        { question: "What is the sum of angles in a quadrilateral?", answer: "360 degrees" },
        { question: "What is the golden ratio also known as?", answer: "Phi" },
        { question: "What is the mode in statistics?", answer: "The most frequently occurring value" },
        { question: "What mathematician is known for his triangle of numbers?", answer: "Blaise Pascal" },
        { question: "What is a polygon with five sides called?", answer: "Pentagon" },
        { question: "What is the formula for distance in coordinate geometry?", answer: "√[(x₂-x₁)² + (y₂-y₁)²]" },
        { question: "What is the smallest prime number?", answer: "2" },
        { question: "What is the circumference of a circle formula?", answer: "2πr (or πd)" },
        { question: "What is the binary representation of the decimal number 8?", answer: "1000" },
        { question: "What is an angle greater than 90 degrees but less than 180 degrees?", answer: "Obtuse angle" },
        { question: "What mathematician developed the laws of motion?", answer: "Isaac Newton" },
        { question: "What is the average of 4, 8, 12, and 16?", answer: "10" }
      ],
      'Food': [
        { question: "What is the main ingredient in bread?", answer: "Flour" },
        { question: "What country is sushi from?", answer: "Japan" },
        { question: "What is the most consumed fruit in the world?", answer: "Tomato (or banana)" },
        { question: "What vegetable makes you cry when you cut it?", answer: "Onion" },
        { question: "What is the main ingredient in hummus?", answer: "Chickpeas" },
        { question: "What is the most expensive spice by weight?", answer: "Saffron" },
        { question: "What type of pasta is shaped like tubes?", answer: "Penne (or rigatoni)" },
        { question: "What nut is used to make marzipan?", answer: "Almond" },
        { question: "What is the main ingredient in guacamole?", answer: "Avocado" },
        { question: "What fruit is dried to make raisins?", answer: "Grapes" },
        { question: "What is tofu made from?", answer: "Soybeans" },
        { question: "What is the spiciest part of a chili pepper?", answer: "The seeds and membrane" },
        { question: "What is calamari?", answer: "Squid" },
        { question: "What fruit has its seeds on the outside?", answer: "Strawberry" },
        { question: "What is the main ingredient in a traditional Greek tzatziki?", answer: "Yogurt" },
        { question: "What type of cheese is used on pizza?", answer: "Mozzarella" },
        { question: "What is the main ingredient in pesto?", answer: "Basil" },
        { question: "What grain is used to make risotto?", answer: "Arborio rice" },
        { question: "What is wasabi?", answer: "Japanese horseradish" },
        { question: "What vegetable is used to make pickles?", answer: "Cucumber" },
        { question: "What is the main ingredient in falafel?", answer: "Chickpeas (or fava beans)" },
        { question: "What nut is used to make Nutella?", answer: "Hazelnut" },
        { question: "What is kimchi?", answer: "Fermented Korean cabbage" },
        { question: "What fruit is prune made from?", answer: "Plum" },
        { question: "What is the main ingredient in tahini?", answer: "Sesame seeds" },
        { question: "What type of meat is used in a traditional Bolognese sauce?", answer: "Beef (and pork)" },
        { question: "What is quinoa?", answer: "A grain (technically a seed)" },
        { question: "What vegetable is known as an eggplant in America?", answer: "Aubergine" },
        { question: "What is the main ingredient in baba ganoush?", answer: "Eggplant" },
        { question: "What type of oil is traditionally used in Mediterranean cooking?", answer: "Olive oil" },
        { question: "What is mascarpone?", answer: "Italian cream cheese" },
        { question: "What grain is couscous made from?", answer: "Wheat (semolina)" },
        { question: "What is the main protein in eggs?", answer: "Albumin" },
        { question: "What is edamame?", answer: "Young soybeans" },
        { question: "What vegetable is also known as a courgette?", answer: "Zucchini" },
        { question: "What is ghee?", answer: "Clarified butter" },
        { question: "What fruit is used to make prosciutto e melone?", answer: "Melon (cantaloupe)" },
        { question: "What is the main ingredient in a traditional Japanese miso soup?", answer: "Miso paste" },
        { question: "What type of pasta is shaped like little ears?", answer: "Orecchiette" },
        { question: "What is the name of the process of soaking meat in a seasoned liquid?", answer: "Marinating" }
      ],
      'Norway': [
        { question: "What is the capital of Norway?", answer: "Oslo" },
        { question: "What is the official language of Norway?", answer: "Norwegian" },
        { question: "What is Norway's currency?", answer: "Norwegian krone (NOK)" },
        { question: "What famous fjord is a UNESCO World Heritage site?", answer: "Geirangerfjord (or Nærøyfjord)" },
        { question: "Who is the famous Norwegian playwright who wrote 'A Doll's House'?", answer: "Henrik Ibsen" },
        { question: "What is the name of the Viking ship museum in Oslo?", answer: "Viking Ship Museum" },
        { question: "What Norwegian explorer was first to reach the South Pole?", answer: "Roald Amundsen" },
        { question: "What is the traditional Norwegian Christmas dish?", answer: "Ribbe (pork ribs) or pinnekjøtt" },
        { question: "What is the name of Norway's national day?", answer: "Constitution Day (May 17th)" },
        { question: "What is the famous Norwegian edible brown cheese called?", answer: "Brunost" },
        { question: "What city hosted the 1994 Winter Olympics?", answer: "Lillehammer" },
        { question: "What is the northern lights called in Norwegian?", answer: "Nordlys" },
        { question: "Who painted 'The Scream'?", answer: "Edvard Munch" },
        { question: "What is Norway's largest city?", answer: "Oslo" },
        { question: "What is the name of the traditional Norwegian sweater?", answer: "Lusekofte (or Marius sweater)" },
        { question: "What Norwegian composer wrote 'In the Hall of the Mountain King'?", answer: "Edvard Grieg" },
        { question: "What is the second-largest city in Norway?", answer: "Bergen" },
        { question: "What is the name of Norway's parliament?", answer: "Stortinget" },
        { question: "What is the traditional Norwegian flat bread called?", answer: "Flatbrød" },
        { question: "What mountain plateau is popular for hiking in Norway?", answer: "Preikestolen (or Trolltunga)" },
        { question: "Who is the current King of Norway?", answer: "Harald V" },
        { question: "What is the name of Norway's main airline?", answer: "Norwegian (or SAS)" },
        { question: "What Norwegian explorer sailed on the Kon-Tiki?", answer: "Thor Heyerdahl" },
        { question: "What is the traditional Norwegian fish dish?", answer: "Lutefisk (or rakfisk)" },
        { question: "What is Norway's highest mountain?", answer: "Galdhøpiggen" },
        { question: "What sea borders Norway to the west?", answer: "Norwegian Sea" },
        { question: "What is the name of the famous rock formation in Norway?", answer: "Preikestolen (Pulpit Rock)" },
        { question: "What Norwegian author wrote the Kristin Lavransdatter trilogy?", answer: "Sigrid Undset" },
        { question: "What is Norway's national animal?", answer: "Moose (elk)" },
        { question: "What is the midnight sun?", answer: "24-hour daylight in summer in the Arctic" },
        { question: "What Norwegian city is known as the 'Gateway to the Arctic'?", answer: "Tromsø" },
        { question: "What is the traditional Norwegian waffle shape?", answer: "Heart-shaped" },
        { question: "What Norwegian footballer is considered one of the best strikers?", answer: "Erling Haaland" },
        { question: "What is the name of the Norwegian royal palace?", answer: "Royal Palace (Det Kongelige Slott)" },
        { question: "What is Norway's main natural resource?", answer: "Oil (petroleum)" },
        { question: "What is the traditional Norwegian folk dance called?", answer: "Halling" },
        { question: "What Norwegian scientist invented dynamite?", answer: "Alfred Nobel" },
        { question: "What is the name of Norway's largest lake?", answer: "Mjøsa" },
        { question: "What Norwegian city is known for its colorful wooden houses?", answer: "Bergen (Bryggen)" },
        { question: "What is the Norwegian word for goodbye?", answer: "Ha det (or adjø)" }
      ],
      'Sweden': [
        { question: "What is the capital of Sweden?", answer: "Stockholm" },
        { question: "What is the official language of Sweden?", answer: "Swedish" },
        { question: "What is Sweden's currency?", answer: "Swedish krona (SEK)" },
        { question: "What Swedish furniture company is known worldwide?", answer: "IKEA" },
        { question: "What is the name of the Nobel Prize ceremony city?", answer: "Stockholm" },
        { question: "Who is the famous Swedish pop group with hits like 'Dancing Queen'?", answer: "ABBA" },
        { question: "What is the traditional Swedish meatball called?", answer: "Köttbullar" },
        { question: "What Swedish holiday involves dancing around a pole?", answer: "Midsummer (Midsommar)" },
        { question: "Who is Sweden's most famous tennis player?", answer: "Björn Borg" },
        { question: "What is Sweden's largest city?", answer: "Stockholm" },
        { question: "What Swedish author wrote the Millennium trilogy?", answer: "Stieg Larsson" },
        { question: "What is the name of Sweden's traditional Christmas buffet?", answer: "Julbord" },
        { question: "What Swedish car manufacturer is known for safety?", answer: "Volvo" },
        { question: "What is Sweden's second-largest city?", answer: "Gothenburg (Göteborg)" },
        { question: "What Swedish actress won an Oscar for Casablanca?", answer: "Ingrid Bergman" },
        { question: "What is the traditional Swedish coffee break called?", answer: "Fika" },
        { question: "Who founded IKEA?", answer: "Ingvar Kamprad" },
        { question: "What is the name of Sweden's parliament?", answer: "Riksdag" },
        { question: "What Swedish city is known for its university?", answer: "Uppsala" },
        { question: "What is the traditional Swedish cinnamon roll called?", answer: "Kanelbulle" },
        { question: "What Swedish football player played for Barcelona?", answer: "Zlatan Ibrahimović" },
        { question: "What is Sweden's national day?", answer: "June 6th" },
        { question: "What Swedish music streaming service is popular worldwide?", answer: "Spotify" },
        { question: "What is the name of Sweden's ice hotel?", answer: "Icehotel (in Jukkasjärvi)" },
        { question: "What Swedish author created Pippi Longstocking?", answer: "Astrid Lindgren" },
        { question: "What is the archipelago near Stockholm called?", answer: "Stockholm Archipelago" },
        { question: "What Swedish DJ is known for 'Wake Me Up'?", answer: "Avicii" },
        { question: "What is the Swedish word for thank you?", answer: "Tack" },
        { question: "What is Sweden's highest mountain?", answer: "Kebnekaise" },
        { question: "What Swedish film director is known for 'The Seventh Seal'?", answer: "Ingmar Bergman" },
        { question: "What is the traditional Swedish fermented fish?", answer: "Surströmming" },
        { question: "What Swedish company makes telecommunications equipment?", answer: "Ericsson" },
        { question: "What is the name of Sweden's royal palace?", answer: "Stockholm Palace (Kungliga Slottet)" },
        { question: "Who is the current King of Sweden?", answer: "Carl XVI Gustaf" },
        { question: "What Swedish fashion retailer is known for fast fashion?", answer: "H&M" },
        { question: "What is the traditional Swedish princess cake called?", answer: "Prinsesstårta" },
        { question: "What Swedish city is known for the Turning Torso building?", answer: "Malmö" },
        { question: "What is the name of Sweden's Nobel Prize founder?", answer: "Alfred Nobel" },
        { question: "What Swedish car brand is now owned by China?", answer: "Volvo" },
        { question: "What is the Swedish word for hello?", answer: "Hej" }
      ]
    };
    
    const VALUES = [200, 400, 600, 800, 1000];
    
    // Helper function to shuffle array
    const shuffleArray = <T,>(array: T[]): T[] => {
      const newArray = [...array];
      for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
      }
      return newArray;
    };
    
    // Use preselected categories if provided, otherwise randomly select 4 categories from the pool
    const allCategoryNames = Object.keys(questionPool);
    const selectedCategoryNames = preselectedCategories || shuffleArray(allCategoryNames).slice(0, 4);
    
    // Create categories array
    const categories: Array<{ id: number; title: string }> = selectedCategoryNames.map((cat, index) => ({
      id: index + 1,
      title: cat
    }));
    
    // For each selected category, randomly select 5 questions
    const questionsAndAnswers: Record<string, { question: string; answer: string; questionImageUrl?: string; answerImageUrl?: string; alternatives?: string[] }> = {};
    
    selectedCategoryNames.forEach((category) => {
      const categoryQuestions = questionPool[category as keyof typeof questionPool];
      const shuffledQuestions = shuffleArray(categoryQuestions);
      const selectedQuestions = shuffledQuestions.slice(0, 5);
      
      VALUES.forEach((value, qIndex) => {
        const key = `${category}-${value}`;
        const qa = selectedQuestions[qIndex];
        const parsedQuestion = parseContentWithImage(qa.question);
        const parsedAnswer = parseContentWithImage(qa.answer);
        questionsAndAnswers[key] = {
          question: parsedQuestion.text || qa.question,
          answer: parsedAnswer.text || qa.answer,
          questionImageUrl: parsedQuestion.imageUrl,
          answerImageUrl: parsedAnswer.imageUrl,
          alternatives: parsedQuestion.alternatives
        };
      });
    });
    
    return {
      categories,
      questionsAndAnswers
    };
  };

  const generateQuestionsFromCategories = async (selectedCategoryNames: string[]): Promise<GameData> => {
    // Simply call generateAIQuestions with the user's selected categories
    return await generateAIQuestions(selectedCategoryNames);
  };

  const generateAIQuestionsForTopics = async (userTopics: string[]): Promise<GameData> => {
    // Call AI API to generate questions based on user topics
    // NOTE: This uses a mock implementation. To integrate a real AI API:
    // 1. Set up a backend endpoint that calls OpenAI/Anthropic/etc.
    // 2. Store your API key securely on the backend (never in frontend code)
    // 3. Replace the mock call below with: await fetch('/api/generate-questions', { method: 'POST', body: JSON.stringify({ topics: userTopics }) })
    
    const response = await callAIAPI(userTopics);
    return response;
  };

  // Mock AI API call - Replace this with real AI integration
  const callAIAPI = async (topics: string[]): Promise<GameData> => {
    /*
    ═══════════════════════════════════════════════����═══════════════════════════════
    INTEGRATE REAL AI API HERE
    ═══════════════════════════════════════════════════════════════════════════════
    
    To use a real AI API (OpenAI, Anthropic Claude, etc.):
    
    1. CREATE A BACKEND ENDPOINT
       - Never put API keys in frontend code!
       - Create a server endpoint like: POST /api/generate-jeopardy-questions
       
    2. EXAMPLE BACKEND CODE (Node.js/Express):
       
       app.post('/api/generate-jeopardy-questions', async (req, res) => {
         const { topics } = req.body;
         
         const prompt = `Generate Jeopardy-style trivia questions for these categories: ${topics.join(', ')}.
         
         For each category, create exactly 5 questions with increasing difficulty:
         - Question 1 ($200): Easy - common knowledge
         - Question 2 ($400): Medium - requires some knowledge
         - Question 3 ($600): Moderate - requires specific knowledge
         - Question 4 ($800): Hard - requires detailed knowledge
         - Question 5 ($1000): Very Hard - requires expert knowledge
         
         Return a JSON object with this structure:
         {
           "categories": [
             {"id": 1, "title": "Category Name"},
             ...
           ],
           "questionsAndAnswers": {
             "Category Name-200": {"question": "...", "answer": "..."},
             "Category Name-400": {"question": "...", "answer": "..."},
             ...
           }
         }
         
         Keep questions clear and concise. Answers should be brief (1-5 words typically).`;
         
         const response = await openai.chat.completions.create({
           model: "gpt-4",
           messages: [{ role: "user", content: prompt }],
           response_format: { type: "json_object" }
         });
         
         res.json(JSON.parse(response.choices[0].message.content));
       });
       
    3. REPLACE THIS FUNCTION WITH:
       
       const response = await fetch('/api/generate-jeopardy-questions', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ topics })
       });
       return await response.json();
       
    ═══════════════════════════════════════════════════════════════════════════════
    */
    
    // MOCK IMPLEMENTATION BELOW - Remove when integrating real AI
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const VALUES = [200, 400, 600, 800, 1000];
    
    // Filter out empty topics and auto-filled placeholder topics (Topic 1, Topic 2, etc.)
    const filledTopics = topics.filter(t => {
      const trimmed = t.trim();
      return trimmed !== '' && !trimmed.match(/^Topic \d+$/i);
    }).slice(0, 4);
    
    // Fill remaining slots with placeholder topics if needed
    while (filledTopics.length < 4) {
      const placeholderTopics = ['General Knowledge', 'Trivia', 'Mixed Topics', 'Random Facts'];
      filledTopics.push(placeholderTopics[filledTopics.length]);
    }
    
    // Create categories
    const categories: Array<{ id: number; title: string }> = filledTopics.map((topic, index) => ({
      id: index + 1,
      title: topic.trim()
    }));
    
    // Generate mock questions
    const questionsAndAnswers: Record<string, { question: string; answer: string; questionImageUrl?: string; answerImageUrl?: string }> = {};
    
    filledTopics.forEach((topic) => {
      VALUES.forEach((value, qIndex) => {
        const key = `${topic.trim()}-${value}`;
        const qa = generateMockQuestion(topic, qIndex + 1);
        const parsedQuestion = parseContentWithImage(qa.question);
        const parsedAnswer = parseContentWithImage(qa.answer);
        questionsAndAnswers[key] = {
          question: parsedQuestion.text || qa.question,
          answer: parsedAnswer.text || qa.answer,
          questionImageUrl: parsedQuestion.imageUrl,
          answerImageUrl: parsedAnswer.imageUrl
        };
      });
    });
    
    return {
      categories,
      questionsAndAnswers
    };
  };

  // Mock question generator - Remove when integrating real AI
  const generateMockQuestion = (topic: string, difficulty: number): { question: string; answer: string } => {
    const difficultyLevel = ['Easy', 'Medium', 'Moderate', 'Hard', 'Very Hard'][difficulty - 1];
    const value = [200, 400, 600, 800, 1000][difficulty - 1];
    
    return {
      question: `[AI would generate a ${difficultyLevel} question about "${topic}" here - $${value}]`,
      answer: `[AI-generated answer]`
    };
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsGenerating(true);
      
      try {
        const XLSX = await import('xlsx');
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        
        // Parse the Excel data
        // Row 1: Categories (columns A-D)
        // Rows 2-6: Questions (5 rows)
        // Rows 7-11: Answers (5 rows)
        
        const VALUES = [200, 400, 600, 800, 1000];
        const categories: Array<{ id: number; title: string }> = [];
        const questionsAndAnswers: Record<string, { question: string; answer: string; questionImageUrl?: string; answerImageUrl?: string; alternatives?: string[] }> = {};

        // Extract categories from first row (A1, B1, C1, D1)
        for (let col = 0; col < 4; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
          const cellValue = worksheet[cellAddress]?.v || `Category ${col + 1}`;
          categories.push({
            id: col + 1,
            title: String(cellValue)
          });
        }
        
        // Extract questions (rows 2-6, which are row indices 1-5)
        // Extract answers (rows 7-11, which are row indices 6-10)
        for (let col = 0; col < 4; col++) {
          const categoryTitle = categories[col].title;
          
          for (let qIndex = 0; qIndex < 5; qIndex++) {
            const questionRow = qIndex + 1; // Excel rows 2-6 (indices 1-5)
            const answerRow = qIndex + 6;   // Excel rows 7-11 (indices 6-10)
            const value = VALUES[qIndex];
            
            // Get question
            const questionCell = XLSX.utils.encode_cell({ r: questionRow, c: col });
            const question = String(worksheet[questionCell]?.v || '');
            
            // Get answer
            const answerCell = XLSX.utils.encode_cell({ r: answerRow, c: col });
            const answer = String(worksheet[answerCell]?.v || '');
            
            // Parse content to extract text and images
            const parsedQuestion = parseContentWithImage(question);
            const parsedAnswer = parseContentWithImage(answer);
            
            // Store with key format: "Category-Value"
            const key = `${categoryTitle}-${value}`;
            questionsAndAnswers[key] = {
              question: parsedQuestion.text || question,
              answer: parsedAnswer.text || answer,
              questionImageUrl: parsedQuestion.imageUrl,
              answerImageUrl: parsedAnswer.imageUrl,
              alternatives: parsedQuestion.alternatives
            };
          }
        }
        
        const gameData: GameData = {
          categories,
          questionsAndAnswers
        };
        
        // Add a delay to show the loading screen
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Trigger subtle sparkling stars animation
        const count = 50;
        const defaults = {
          spread: 360,
          ticks: 100,
          gravity: 0,
          decay: 0.94,
          startVelocity: 10,
          shapes: ['star'] as Shape[],
          colors: ['#FFFFFF'],
          scalar: 0.6
        };

        function randomInRange(min: number, max: number) {
          return Math.random() * (max - min) + min;
        }

        // Transition to game board first
        setTimeout(() => {
          onComplete(playerNames, gameData);
        }, 50);

        // Start sparkle animation after a delay so it shows over the game board
        setTimeout(() => {
          const interval = setInterval(() => {
            confetti({
              ...defaults,
              particleCount: 3,
              origin: {
                x: randomInRange(0.1, 0.9),
                y: randomInRange(0.1, 0.9)
              }
            });
          }, 100);

          // Clear interval after animation completes
          setTimeout(() => {
            clearInterval(interval);
          }, 1500);
        }, 50);
      } catch (error) {
        console.error('Error parsing Excel file:', error);
        alert('Error reading Excel file. Please make sure it follows the correct format.');
        setIsGenerating(false);
      }
      
      // Reset file input so the same file can be selected again
      e.target.value = '';
    }
  };

  if (showFileFormat) {
    return <FileFormatView onBack={() => setShowFileFormat(false)} onDownloadTemplate={handleDownloadTemplate} />;
  }

  return (
    <div 
      className="bg-[#071277] h-screen w-screen overflow-hidden relative uppercase flex items-center justify-center"
    >
      {/* Step Indicator */}
      <p className="absolute left-1/2 -translate-x-1/2 top-8 font-['Roboto_Condensed',sans-serif] font-bold text-[#fdc065] text-[clamp(1.125rem,min(2vw,2.5vh),1.5rem)] uppercase">
        SETUP {step === 4 ? 3 : step} / 3
      </p>

      {/* Content */}
      <div className="flex flex-col justify-center items-center px-8 max-w-[1200px] w-full gap-12">
        {step === 1 && (
          <>
            <p className="font-['Eczar',sans-serif] font-medium leading-[1.3] text-[clamp(1.5rem,5vw,5rem)] text-center text-white px-4 sm:px-[100px] py-[0px] normal-case">
              How many people will be playing?
            </p>

            {/* Number Input with Plus/Minus */}
            <div className="flex items-center" style={{ gap: 'clamp(1rem, 8vw, 3rem)' }}>
              <button
                onClick={handleDecrement}
                disabled={playerCount <= MIN_PLAYERS}
                className="flex items-center justify-center bg-[#707EFF] text-[#071277] hover:opacity-80 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer rounded-lg"
                style={{ width: 'clamp(40px, 10vw, 56px)', height: 'clamp(40px, 10vw, 56px)' }}
              >
                <Minus size={28} strokeWidth={4} strokeLinecap="square" strokeLinejoin="miter" style={{ width: 'clamp(20px, 5vw, 28px)', height: 'clamp(20px, 5vw, 28px)' }} />
              </button>

              <div className="font-['Eczar',sans-serif] font-medium text-[#fdc065] text-center" style={{ fontSize: 'clamp(3rem, 15vw, 6.25rem)', minWidth: 'clamp(60px, 20vw, 110px)' }}>
                {playerCount}
              </div>

              <button
                onClick={handleIncrement}
                disabled={playerCount >= MAX_PLAYERS}
                className="flex items-center justify-center bg-[#707EFF] text-[#071277] hover:opacity-80 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer rounded-lg"
                style={{ width: 'clamp(40px, 10vw, 56px)', height: 'clamp(40px, 10vw, 56px)' }}
              >
                <Plus size={28} strokeWidth={4} strokeLinecap="square" strokeLinejoin="miter" style={{ width: 'clamp(20px, 5vw, 28px)', height: 'clamp(20px, 5vw, 28px)' }} />
              </button>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <p className="font-['Eczar',sans-serif] font-medium leading-[1.3] text-[clamp(1.5rem,5vw,5rem)] text-center text-white p-[0px] normal-case">
              What topics would you like?
            </p>

            {/* Category Dropdowns */}
            <div className="w-full gap-4 flex flex-col max-w-[450px]">
              {selectedCategories.map((category, index) => (
                <Select
                  key={index}
                  value={category}
                  onValueChange={(value) => handleCategoryChange(index, value)}
                >
                  <SelectTrigger 
                    className="relative w-full !h-auto pl-6 pr-14 py-4 bg-[#071277] border-2 border-[#707EFF] text-white font-['Roboto_Condensed',sans-serif] text-[clamp(1rem,2vw,1.5rem)] rounded-lg outline-none data-[state=open]:border-[#fdc065] data-[state=open]:shadow-[inset_0_0_0_2px_#fdc065] focus-visible:border-[#fdc065] focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:shadow-[inset_0_0_0_2px_#fdc065] uppercase cursor-pointer !justify-start data-[placeholder]:text-[#707EFF] [&>svg]:!absolute [&>svg]:!right-6 [&>svg]:!text-white [&>svg]:!opacity-100 [&>svg]:!w-6 [&>svg]:!h-6"
                  >
                    <SelectValue placeholder={`TOPIC ${index + 1}`} />
                  </SelectTrigger>
                  <SelectContent 
                    className="bg-[#071277] border border-white text-white font-['Roboto_Condensed',sans-serif] text-[clamp(1rem,2vw,1.5rem)] uppercase [&>div]:p-0"
                    position="popper"
                    align="center"
                    sideOffset={4}
                  >
                    {[...AVAILABLE_CATEGORIES].sort().map((cat) => {
                      const isAlreadySelected = selectedCategories.some((selectedCat, selectedIndex) => 
                        selectedCat === cat && selectedIndex !== index
                      );
                      return (
                        <SelectItem 
                          key={cat} 
                          value={cat}
                          disabled={isAlreadySelected}
                          className="text-white hover:bg-[#fdc065] hover:text-[#071277] focus:bg-[#fdc065] focus:text-[#071277] cursor-pointer uppercase pl-6 pr-6 data-[disabled]:opacity-30 data-[disabled]:cursor-not-allowed"
                        >
                          {cat.toUpperCase()}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              ))}
            </div>

            {/* Loading Spinner */}
            {isGenerating && (
              <div className="flex items-center justify-center gap-3 mt-4">
                <Loader2 className="animate-spin text-white w-6 h-6" />
                <p className="font-['Roboto_Condensed',sans-serif] text-white text-[clamp(1rem,2vw,1.5rem)] uppercase">
                  LOADING...
                </p>
              </div>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <p className="font-['Eczar',sans-serif] font-medium leading-[1.3] text-[clamp(1.5rem,5vw,5rem)] text-center text-white p-[0px] normal-case">
              Enter the player's names
            </p>

            {/* Player Name Inputs */}
            <div className={`w-full gap-4 ${playerCount > 4 ? 'grid grid-cols-2 max-w-[900px]' : 'flex flex-col max-w-[450px]'}`}>
              {playerNames.map((name, index) => (
                <input
                  key={index}
                  ref={index === 0 ? firstInputRef : null}
                  type="text"
                  value={name}
                  data-player-index={index}
                  onChange={(e) => handlePlayerNameChange(index, e.target.value)}
                  onKeyDown={(e) => handleInputKeyDown(e, index)}
                  onFocus={(e) => {
                    setTimeout(() => e.target.select(), 0);
                  }}
                  onClick={(e) => e.currentTarget.select()}
                  placeholder={`Player ${index + 1}`}
                  className="w-full h-auto px-6 py-4 bg-[#071277] border-2 border-[#707EFF] text-white placeholder:text-[#707EFF] font-['Roboto_Condensed',sans-serif] text-[clamp(1rem,2vw,1.5rem)] rounded-lg outline-none focus:border-[#fdc065] focus:shadow-[inset_0_0_0_2px_#fdc065] uppercase"
                />
              ))}
            </div>
          </>
        )}

        {step === 3 && (
          <div className="pb-[100px] pt-[0px] pr-[0px] pl-[0px]">
            <div className="flex flex-col items-center gap-12">
              <button 
                onClick={() => setShowFileFormat(true)}
                className="cursor-pointer p-3 -m-3 hover:opacity-70 transition-opacity"
              >
                <svg className="w-[clamp(1.5rem,2.5vw,3rem)] h-[clamp(1.5rem,2.5vw,3rem)]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" fill="#707EFF"/>
                  <circle cx="12" cy="8.2" r="1.6" fill="#071277"/>
                  <rect x="10.3" y="11" width="3.4" height="7" rx="0.5" fill="#071277"/>
                </svg>
              </button>
              <p className="font-['Eczar',sans-serif] font-medium leading-[1.3] text-[clamp(1.5rem,5vw,5rem)] text-center text-white p-[0px] mt-[0px] mr-[0px] mb-[40px] ml-[0px] normal-case">
                How would you like to add questions?
              </p>
            </div>

            {/* Question Options */}
            <div className="w-full flex flex-col md:flex-row gap-4 max-w-[1100px]">
              <button
                ref={uploadButtonRef}
                onClick={handleUploadClick}
                className="w-full px-6 py-4 bg-[#071277] border-2 border-[#707EFF] text-white hover:bg-[#707EFF] hover:border-[#707EFF] hover:text-[#FFFFFF] focus:bg-[#707EFF] focus:border-[#707EFF] focus:text-[#FFFFFF] active:bg-[#707EFF] active:border-[#707EFF] active:text-[#FFFFFF] font-['Roboto_Condensed',sans-serif] text-[clamp(1rem,2vw,1.5rem)] rounded-lg outline-none transition-all cursor-pointer uppercase flex items-center justify-center"
              >
                UPLOAD A FILE
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
              />

              <button
                ref={pickTopicsButtonRef}
                onClick={(e) => {
                  e.stopPropagation();
                  setPreviousStep(step);
                  setStep(4);
                }}
                className="w-full px-6 py-4 bg-[#071277] border-2 border-[#707EFF] text-white hover:bg-[#707EFF] hover:border-[#707EFF] hover:text-[#FFFFFF] focus:bg-[#707EFF] focus:border-[#707EFF] focus:text-[#FFFFFF] active:bg-[#707EFF] active:border-[#707EFF] active:text-[#FFFFFF] font-['Roboto_Condensed',sans-serif] text-[clamp(1rem,2vw,1.5rem)] rounded-lg outline-none transition-all cursor-pointer uppercase flex items-center justify-center"
              >
                PICK TOPICS
              </button>

              <button
                ref={surpriseMeButtonRef}
                onClick={async (e) => {
                  e.stopPropagation();
                  setIsGenerating(true);
                  
                  try {
                    const gameData = await generateAIQuestions();
                    
                    // Trigger subtle sparkling stars animation
                    const count = 50;
                    const defaults = {
                      spread: 360,
                      ticks: 100,
                      gravity: 0,
                      decay: 0.94,
                      startVelocity: 10,
                      shapes: ['star'] as Shape[],
                      colors: ['#FFFFFF'],
                      scalar: 0.6
                    };

                    function randomInRange(min: number, max: number) {
                      return Math.random() * (max - min) + min;
                    }

                    // Transition to game board first
                    setTimeout(() => {
                      onComplete(playerNames, gameData);
                    }, 50);

                    // Start sparkle animation after a delay so it shows over the game board
                    setTimeout(() => {
                      const interval = setInterval(() => {
                        confetti({
                          ...defaults,
                          particleCount: 3,
                          origin: {
                            x: randomInRange(0.1, 0.9),
                            y: randomInRange(0.1, 0.9)
                          }
                        });
                      }, 100);

                      // Clear interval after animation completes
                      setTimeout(() => {
                        clearInterval(interval);
                      }, 1500);
                    }, 50);
                  } catch (error) {
                    console.error('Failed to generate questions:', error);
                    alert('Failed to generate questions. Please try again or upload a file instead.');
                    setIsGenerating(false);
                  }
                }}
                disabled={isGenerating}
                className="w-full px-6 py-4 bg-[#071277] border-2 border-[#707EFF] text-white hover:bg-[#707EFF] hover:border-[#707EFF] hover:text-[#FFFFFF] focus:bg-[#707EFF] focus:border-[#707EFF] focus:text-[#FFFFFF] active:bg-[#707EFF] active:border-[#707EFF] active:text-[#FFFFFF] font-['Roboto_Condensed',sans-serif] text-[clamp(1rem,2vw,1.5rem)] rounded-lg outline-none transition-all cursor-pointer uppercase flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#071277] disabled:hover:text-white disabled:hover:border-[#707EFF]"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="animate-spin w-5 h-5" />
                    LOADING...
                  </>
                ) : (
                  'SURPRISE ME'
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* AI Loading Overlay */}
      {isGenerating && (step === 3 || step === 4) && (
        <ConfettiRainLoading />
      )}

      {/* Bottom Buttons */}
      <div className={`absolute bottom-8 left-1/2 -translate-x-1/2 flex ${step === 3 ? '' : ''}`} style={step !== 3 ? { gap: 'clamp(1rem, 20vw, 20rem)' } : {}}>
        <button 
          className="flex items-center gap-2 p-4 -m-4 cursor-pointer" 
          onClick={handleGoBack}
        >
          <ChevronLeft className="text-[#fdc065]" size={24} strokeWidth={3} />
          <p className="font-['Roboto_Condensed',sans-serif] font-bold text-[#fdc065] text-[clamp(1.125rem,min(2vw,2.5vh),1.5rem)] uppercase whitespace-nowrap">
            BACK
          </p>
        </button>
        {step !== 3 && (
          <button 
            className="flex items-center gap-2 p-4 -m-4 cursor-pointer" 
            onClick={handleNext}
          >
            <p className="font-['Roboto_Condensed',sans-serif] font-bold text-[#fdc065] text-[clamp(1.125rem,min(2vw,2.5vh),1.5rem)] uppercase whitespace-nowrap">
              {step === 4 ? "LET'S GO" : "NEXT"}
            </p>
            <ChevronRight className="text-[#fdc065]" size={24} strokeWidth={3} />
          </button>
        )}
      </div>
    </div>
  );
}
