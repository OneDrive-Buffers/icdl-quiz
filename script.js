// ==================== Quiz State Management ====================
let quizState = {
    currentModule: null,
    questions: [],
    currentQuestion: 0,
    answers: {},
    moduleTitle: '',
    startTime: null,
    endTime: null
};

// Module data cache
let modulesCache = {};

// ==================== Initialize ====================
document.addEventListener('DOMContentLoaded', () => {
    loadModuleListeners();
});

function loadModuleListeners() {
    document.querySelectorAll('.module-card').forEach(card => {
        card.addEventListener('click', () => {
            const module = card.dataset.module;
            startQuiz(module);
        });
    });
}

// ==================== Load Questions ====================
async function loadQuestions(module) {
    try {
        const response = await fetch(`questions/${module}.json`);
        if (!response.ok) throw new Error('Failed to load questions');
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error loading questions:', error);
        return null;
    }
}

// ==================== Start Quiz ====================
async function startQuiz(module) {
    showLoadingSpinner(true);
    
    const data = await loadQuestions(module);
    if (!data) {
        alert('Error loading module. Please try again.');
        showLoadingSpinner(false);
        return;
    }

    quizState.currentModule = module;
    quizState.questions = shuffleArray(data.questions);
    quizState.moduleTitle = data.title;
    quizState.currentQuestion = 0;
    quizState.answers = {};
    quizState.startTime = new Date();

    modulesCache[module] = data;

    showLoadingSpinner(false);
    switchScreen('quizScreen');
    renderQuestion();
}

// ==================== Render Question ====================
function renderQuestion() {
    const q = quizState.questions[quizState.currentQuestion];
    
    // Update header
    document.getElementById('moduleName').textContent = quizState.moduleTitle;
    
    // Update progress
    const progress = ((quizState.currentQuestion + 1) / quizState.questions.length) * 100;
    document.getElementById('progressFill').style.width = progress + '%';
    document.getElementById('progressText').textContent = 
        `${quizState.currentQuestion + 1}/${quizState.questions.length}`;
    
    // Update difficulty badge
    const diffBadge = document.getElementById('difficultyBadge');
    diffBadge.textContent = q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1);
    diffBadge.className = `difficulty-badge ${q.difficulty}`;
    
    // Update topic badge
    document.getElementById('topicBadge').textContent = q.topic;
    
    // Update question text
    document.getElementById('questionText').textContent = q.question;
    
    // Render options
    const optionsContainer = document.getElementById('optionsContainer');
    optionsContainer.innerHTML = '';
    
    q.options.forEach((option, index) => {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'option';
        
        const isSelected = quizState.answers[quizState.currentQuestion] === index;
        if (isSelected) optionDiv.classList.add('selected');
        
        const input = document.createElement('input');
        input.type = 'radio';
        input.name = 'answer';
        input.value = index;
        input.checked = isSelected;
        input.addEventListener('change', () => selectAnswer(index));
        
        const span = document.createElement('span');
        span.className = 'option-text';
        span.textContent = option;
        
        optionDiv.appendChild(input);
        optionDiv.appendChild(span);
        optionsContainer.appendChild(optionDiv);
    });
    
    // Update navigation buttons
    document.getElementById('prevBtn').disabled = quizState.currentQuestion === 0;
    
    const nextBtn = document.getElementById('nextBtn');
    if (quizState.currentQuestion === quizState.questions.length - 1) {
        nextBtn.textContent = 'Finish Quiz →';
    } else {
        nextBtn.textContent = 'Next →';
    }
    
    // Update score display
    const correct = Object.values(quizState.answers).filter((answerIdx, qIdx) => {
        return quizState.questions[qIdx] && 
               quizState.questions[qIdx].correctAnswer === answerIdx;
    }).length;
    
    const skipped = quizState.questions.length - Object.keys(quizState.answers).length;
    document.getElementById('scoreCorrect').textContent = correct;
    document.getElementById('scoreSkipped').textContent = skipped;
}

// ==================== Select Answer ====================
function selectAnswer(answerIndex) {
    quizState.answers[quizState.currentQuestion] = answerIndex;
    
    const options = document.querySelectorAll('.option');
    options.forEach((opt, idx) => {
        if (idx === answerIndex) {
            opt.classList.add('selected');
        } else {
            opt.classList.remove('selected');
        }
    });
    
    // Update score immediately
    renderQuestion();
}

// ==================== Navigation ====================
function nextQuestion() {
    if (quizState.currentQuestion === quizState.questions.length - 1) {
        finishQuiz();
    } else {
        quizState.currentQuestion++;
        renderQuestion();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function previousQuestion() {
    if (quizState.currentQuestion > 0) {
        quizState.currentQuestion--;
        renderQuestion();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// ==================== Finish Quiz ====================
function finishQuiz() {
    quizState.endTime = new Date();
    
    // Calculate results
    let correct = 0;
    const difficultyStats = { basic: 0, intermediate: 0, advanced: 0 };
    const difficultyCorrect = { basic: 0, intermediate: 0, advanced: 0 };
    const reviewItems = [];
    
    quizState.questions.forEach((q, idx) => {
        const userAnswer = quizState.answers[idx];
        const difficulty = q.difficulty;
        
        difficultyStats[difficulty]++;
        
        if (userAnswer !== undefined && userAnswer === q.correctAnswer) {
            correct++;
            difficultyCorrect[difficulty]++;
        }
        
        reviewItems.push({
            question: q.question,
            difficulty: difficulty,
            isCorrect: userAnswer === q.correctAnswer,
            userAnswer: userAnswer !== undefined ? q.options[userAnswer] : 'Skipped',
            correctAnswer: q.options[q.correctAnswer],
            explanation: q.explanation
        });
    });
    
    const total = quizState.questions.length;
    const percentage = Math.round((correct / total) * 100);
    
    // Display results
    displayResults(correct, total, percentage, difficultyStats, difficultyCorrect, reviewItems);
}

// ==================== Display Results ====================
function displayResults(correct, total, percentage, diffStats, diffCorrect, reviewItems) {
    // Set result icon and title
    let icon, title;
    if (percentage >= 80) {
        icon = '🏆';
        title = 'Excellent! You Passed!';
    } else if (percentage >= 60) {
        icon = '👍';
        title = 'Good Job! Keep Practicing';
    } else if (percentage >= 40) {
        icon = '📚';
        title = 'Keep Learning!';
    } else {
        icon = '💪';
        title = 'Review and Try Again';
    }
    
    document.getElementById('resultIcon').textContent = icon;
    document.getElementById('resultTitle').textContent = title;
    
    // Set stats
    document.getElementById('totalQuestions').textContent = total;
    document.getElementById('correctAnswers').textContent = correct;
    document.getElementById('scorePercentage').textContent = percentage + '%';
    
    // Performance breakdown
    const breakdownHtml = `
        <div class="difficulty-stats">
            <div class="difficulty-stat">
                <span class="difficulty-stat-label">🟢 Basic (${diffStats.basic})</span>
                <span class="difficulty-stat-score">${diffCorrect.basic}/${diffStats.basic}</span>
            </div>
            <div class="difficulty-stat">
                <span class="difficulty-stat-label">🟡 Intermediate (${diffStats.intermediate})</span>
                <span class="difficulty-stat-score">${diffCorrect.intermediate}/${diffStats.intermediate}</span>
            </div>
            <div class="difficulty-stat">
                <span class="difficulty-stat-label">🔴 Advanced (${diffStats.advanced})</span>
                <span class="difficulty-stat-score">${diffCorrect.advanced}/${diffStats.advanced}</span>
            </div>
        </div>
    `;
    document.querySelector('.performance-breakdown').innerHTML = 
        '<h3>Performance by Difficulty</h3>' + breakdownHtml;
    
    // Review section
    const reviewSection = document.getElementById('reviewSection');
    reviewSection.innerHTML = '<h3>Question Review</h3>';
    
    reviewItems.forEach((item, idx) => {
        const reviewDiv = document.createElement('div');
        reviewDiv.className = `review-item ${item.isCorrect ? 'correct' : 'incorrect'}`;
        reviewDiv.innerHTML = `
            <h4>#${idx + 1} ${item.isCorrect ? '✓' : '✗'} ${item.question}</h4>
            <p><strong>Your Answer:</strong> ${item.userAnswer}</p>
            <p><strong>Correct Answer:</strong> ${item.correctAnswer}</p>
            <p><em>${item.explanation}</em></p>
        `;
        reviewSection.appendChild(reviewDiv);
    });
    
    switchScreen('resultsScreen');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==================== Back to Modules ====================
function backToModules() {
    switchScreen('moduleScreen');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==================== Restart Module ====================
function restartModule() {
    startQuiz(quizState.currentModule);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==================== Switch Screen ====================
function switchScreen(screenName) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenName).classList.add('active');
}

// ==================== Utilities ====================
function shuffleArray(arr) {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function showLoadingSpinner(show) {
    const spinner = document.getElementById('loadingSpinner');
    if (show) {
        spinner.classList.add('active');
    } else {
        spinner.classList.remove('active');
    }
}

// ==================== Keyboard Navigation ====================
document.addEventListener('keydown', (e) => {
    if (document.getElementById('quizScreen').classList.contains('active')) {
        if (e.key === 'ArrowRight') nextQuestion();
        if (e.key === 'ArrowLeft') previousQuestion();
        
        // Number keys (1-5) for quick answer selection
        const num = parseInt(e.key);
        if (num >= 1 && num <= 5) {
            const options = document.querySelectorAll('.option input');
            if (num - 1 < options.length) {
                options[num - 1].click();
            }
        }
    }
});
