// 刷题应用主逻辑

// 全局状态
let currentQuestions = [];
let currentIndex = 0;
let selectedOptions = [];
let answered = false;
let sessionCorrect = 0;
let sessionWrong = 0;

// 模拟考试状态
let examMode = false;
let examQuestions = [];
let examAnswers = [];  // 存储每道题的答案
let examTimer = null;
let examStartTime = null;
let examTimeRemaining = 2 * 60 * 60; // 2小时，单位秒
const SINGLE_COUNT = 50;  // 单选题数量
const MULTI_COUNT = 25;   // 多选题数量
const SINGLE_SCORE = 1;   // 单选题每题分数
const MULTI_SCORE = 2;    // 多选题每题分数
const PASS_SCORE = 70;    // 及格分数

// 从本地存储加载进度
function loadProgress() {
    const progress = localStorage.getItem('quizProgress');
    if (progress) {
        return JSON.parse(progress);
    }
    return {
        completed: [],      // 已完成的题目ID
        wrong: [],          // 答错的题目ID
        correctCount: 0,    // 总正确数
        totalAttempts: 0,   // 总尝试数
        lastIndex: 0        // 顺序刷题的位置
    };
}

// 保存进度到本地存储
function saveProgress(progress) {
    localStorage.setItem('quizProgress', JSON.stringify(progress));
}

// 获取进度
const progress = loadProgress();

// 初始化首页
function initHome() {
    const questions = window.QUESTIONS || [];
    
    // 更新统计数据
    document.getElementById('total-questions').textContent = questions.length;
    document.getElementById('completed-count').textContent = progress.completed.length;
    
    const rate = progress.totalAttempts > 0 
        ? Math.round((progress.correctCount / progress.totalAttempts) * 100) 
        : 0;
    document.getElementById('correct-rate').textContent = rate + '%';
}

// 显示页面
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');
}

// 返回首页
function goHome() {
    initHome();
    showPage('home-page');
}

// 顺序刷题
function startSequential() {
    const questions = window.QUESTIONS || [];
    if (questions.length === 0) {
        alert('题库为空，请先导入题目！');
        return;
    }
    currentQuestions = [...questions];
    sessionCorrect = 0;
    sessionWrong = 0;
    
    // 检查是否有上次的进度
    if (progress.lastIndex > 0 && progress.lastIndex < questions.length) {
        if (confirm(`上次刷到第 ${progress.lastIndex + 1} 题，是否继续？\n\n点击"确定"继续上次进度\n点击"取消"从头开始`)) {
            currentIndex = progress.lastIndex;
        } else {
            currentIndex = 0;
            progress.lastIndex = 0;
            saveProgress(progress);
        }
    } else {
        currentIndex = 0;
    }
    
    showPage('quiz-page');
    renderQuestion();
}

// 随机刷题
function startRandom() {
    const questions = window.QUESTIONS || [];
    if (questions.length === 0) {
        alert('题库为空，请先导入题目！');
        return;
    }
    currentQuestions = shuffleArray([...questions]);
    currentIndex = 0;
    sessionCorrect = 0;
    sessionWrong = 0;
    showPage('quiz-page');
    renderQuestion();
}

// 错题重做
function startWrongOnly() {
    const questions = window.QUESTIONS || [];
    const wrongQuestions = questions.filter(q => progress.wrong.includes(q.id));
    
    if (wrongQuestions.length === 0) {
        alert('没有错题记录！');
        return;
    }
    
    currentQuestions = shuffleArray(wrongQuestions);
    currentIndex = 0;
    sessionCorrect = 0;
    sessionWrong = 0;
    showPage('quiz-page');
    renderQuestion();
}

// 显示分类
function showCategories() {
    const questions = window.QUESTIONS || [];
    const categories = {};
    
    questions.forEach(q => {
        const cat = q.category || '未分类';
        if (!categories[cat]) {
            categories[cat] = 0;
        }
        categories[cat]++;
    });
    
    const categoryList = document.getElementById('category-list');
    categoryList.innerHTML = '';
    
    Object.keys(categories).forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'category-item';
        btn.innerHTML = `
            <span class="category-name">${cat}</span>
            <span class="category-count">${categories[cat]} 题</span>
        `;
        btn.onclick = () => startCategory(cat);
        categoryList.appendChild(btn);
    });
    
    showPage('category-page');
}

// 按分类刷题
function startCategory(category) {
    const questions = window.QUESTIONS || [];
    currentQuestions = questions.filter(q => (q.category || '未分类') === category);
    currentIndex = 0;
    sessionCorrect = 0;
    sessionWrong = 0;
    showPage('quiz-page');
    renderQuestion();
}

// 渲染题目
function renderQuestion() {
    const question = currentQuestions[currentIndex];
    if (!question) return;
    
    // 滚动到题目卡片位置，确保能看到题目类型和题目内容
    const questionCard = document.querySelector('.question-card');
    if (questionCard) {
        questionCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    // 保存顺序刷题位置
    if (currentQuestions.length === (window.QUESTIONS || []).length) {
        progress.lastIndex = currentIndex;
        saveProgress(progress);
    }
    
    // 更新进度
    document.getElementById('current-index').textContent = currentIndex + 1;
    document.getElementById('total-count').textContent = currentQuestions.length;
    
    const progressPercent = ((currentIndex + 1) / currentQuestions.length) * 100;
    document.getElementById('progress-fill').style.width = progressPercent + '%';
    
    // 显示题目类型
    const typeElement = document.getElementById('question-type');
    const typeText = question.type === 'multiple' ? '多选题' : '单选题';
    typeElement.textContent = typeText;
    typeElement.className = 'question-type ' + question.type;
    
    // 显示题目内容（带题号）
    document.getElementById('question-text').textContent = (currentIndex + 1) + '. ' + question.question;
    
    // 渲染选项
    const optionsList = document.getElementById('options-list');
    optionsList.innerHTML = '';
    
    const optionLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    
    question.options.forEach((option, index) => {
        const div = document.createElement('div');
        div.className = 'option-item' + (question.type === 'multiple' ? ' multiple' : '');
        div.innerHTML = `
            <span class="option-marker">${optionLabels[index]}</span>
            <span class="option-text">${option}</span>
        `;
        div.onclick = () => selectOption(index);
        optionsList.appendChild(div);
    });
    
    // 重置状态
    selectedOptions = [];
    answered = false;
    document.getElementById('result-card').classList.remove('show');
    
    // 更新按钮状态
    document.getElementById('prev-btn').disabled = currentIndex === 0;
    document.getElementById('submit-btn').disabled = false;
    document.getElementById('submit-btn').textContent = '提交答案';
    document.getElementById('next-btn').disabled = currentIndex === currentQuestions.length - 1;
}

// 选择选项
function selectOption(index) {
    if (answered) return;
    
    const question = currentQuestions[currentIndex];
    const options = document.querySelectorAll('.option-item');
    
    if (question.type === 'multiple') {
        // 多选题
        const pos = selectedOptions.indexOf(index);
        if (pos > -1) {
            selectedOptions.splice(pos, 1);
            options[index].classList.remove('selected');
        } else {
            selectedOptions.push(index);
            options[index].classList.add('selected');
        }
    } else {
        // 单选题
        selectedOptions = [index];
        options.forEach((opt, i) => {
            if (i === index) {
                opt.classList.add('selected');
            } else {
                opt.classList.remove('selected');
            }
        });
    }
}

// 提交答案
function submitAnswer() {
    if (selectedOptions.length === 0) {
        alert('请选择答案！');
        return;
    }
    
    if (answered) {
        // 已经提交过，进入下一题
        nextQuestion();
        return;
    }
    
    const question = currentQuestions[currentIndex];
    const options = document.querySelectorAll('.option-item');
    
    // 标记选项状态
    options.forEach(opt => opt.classList.add('disabled'));
    
    // 获取正确答案（转换为索引数组）
    let correctAnswers = question.answer;
    if (!Array.isArray(correctAnswers)) {
        correctAnswers = [correctAnswers];
    }
    
    // 检查答案
    const selectedSorted = [...selectedOptions].sort();
    const correctSorted = [...correctAnswers].sort();
    const isCorrect = JSON.stringify(selectedSorted) === JSON.stringify(correctSorted);
    
    // 标记正确和错误的选项
    correctAnswers.forEach(idx => {
        options[idx].classList.add('correct');
    });
    
    selectedOptions.forEach(idx => {
        if (!correctAnswers.includes(idx)) {
            options[idx].classList.add('wrong');
        }
    });
    
    // 显示结果
    const resultCard = document.getElementById('result-card');
    const resultIcon = document.getElementById('result-icon');
    const resultText = document.getElementById('result-text');
    const answerRow = document.getElementById('answer-row');
    const explanation = document.getElementById('explanation');
    
    if (isCorrect) {
        resultIcon.textContent = '🎉';
        resultText.textContent = '回答正确！';
        resultText.className = 'result-text correct';
        sessionCorrect++;
    } else {
        resultIcon.textContent = '😢';
        resultText.textContent = '回答错误';
        resultText.className = 'result-text wrong';
        sessionWrong++;
        
        // 记录错题
        if (!progress.wrong.includes(question.id)) {
            progress.wrong.push(question.id);
        }
    }
    
    // 显示正确答案和选择答案
    const optionLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const correctLabels = correctAnswers.map(idx => optionLabels[idx]).join('、');
    const selectedLabels = selectedOptions.map(idx => optionLabels[idx]).join('、');
    answerRow.innerHTML = `
        <div class="answer-item selected-answer">
            <strong>我的答案：</strong><span class="answer-selected ${isCorrect ? 'correct' : 'wrong'}">${selectedLabels}</span>
        </div>
        <div class="answer-item correct-answer">
            <strong>正确答案：</strong><span class="answer-highlight">${correctLabels}</span>
        </div>
    `;
    
    // 显示解析
    if (question.explanation) {
        explanation.textContent = question.explanation;
        explanation.style.display = 'block';
    } else {
        explanation.textContent = '暂无解析';
        explanation.style.display = 'block';
    }
    
    resultCard.classList.add('show');
    
    // 自动滚动到答案区域
    setTimeout(() => {
        resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
    
    // 更新进度
    if (!progress.completed.includes(question.id)) {
        progress.completed.push(question.id);
    }
    progress.totalAttempts++;
    if (isCorrect) {
        progress.correctCount++;
        // 如果答对了，从错题中移除
        const wrongIndex = progress.wrong.indexOf(question.id);
        if (wrongIndex > -1) {
            progress.wrong.splice(wrongIndex, 1);
        }
    }
    saveProgress(progress);
    
    answered = true;
    document.getElementById('submit-btn').textContent = '下一题';
}

// 上一题
function prevQuestion() {
    if (currentIndex > 0) {
        currentIndex--;
        renderQuestion();
    }
}

// 下一题
function nextQuestion() {
    if (currentIndex < currentQuestions.length - 1) {
        currentIndex++;
        renderQuestion();
    } else {
        // 答题结束
        showResults();
    }
}

// 显示最终结果
function showResults() {
    document.getElementById('final-correct').textContent = sessionCorrect;
    document.getElementById('final-wrong').textContent = sessionWrong;
    
    const total = sessionCorrect + sessionWrong;
    const rate = total > 0 ? Math.round((sessionCorrect / total) * 100) : 0;
    document.getElementById('final-rate').textContent = rate + '%';
    
    showPage('result-page');
}

// 查看错题
function reviewWrong() {
    startWrongOnly();
}

// 重置进度
function resetProgress() {
    if (confirm('确定要重置所有学习进度吗？此操作不可恢复！')) {
        localStorage.removeItem('quizProgress');
        progress.completed = [];
        progress.wrong = [];
        progress.correctCount = 0;
        progress.totalAttempts = 0;
        progress.lastIndex = 0;
        initHome();
        alert('进度已重置！');
    }
}

// 数组随机排序
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    initHome();
});

// ==================== 模拟考试功能 ====================

// 开始模拟考试
function startExam() {
    const questions = window.QUESTIONS || [];
    
    // 筛选单选题和多选题
    const singleQuestions = questions.filter(q => q.type === 'single');
    const multiQuestions = questions.filter(q => q.type === 'multiple');
    
    if (singleQuestions.length < SINGLE_COUNT) {
        alert(`单选题数量不足！需要${SINGLE_COUNT}道，当前只有${singleQuestions.length}道`);
        return;
    }
    
    if (multiQuestions.length < MULTI_COUNT) {
        alert(`多选题数量不足！需要${MULTI_COUNT}道，当前只有${multiQuestions.length}道`);
        return;
    }
    
    // 随机选择题目
    const selectedSingle = shuffleArray([...singleQuestions]).slice(0, SINGLE_COUNT);
    const selectedMulti = shuffleArray([...multiQuestions]).slice(0, MULTI_COUNT);
    
    // 合并：先单选后多选
    examQuestions = [...selectedSingle, ...selectedMulti];
    examAnswers = new Array(examQuestions.length).fill(null);
    
    // 重置考试状态
    examMode = true;
    currentIndex = 0;
    examTimeRemaining = 2 * 60 * 60;
    examStartTime = Date.now();
    
    // 显示考试页面
    showPage('exam-page');
    renderExamQuestion();
    startExamTimer();
}

// 渲染考试题目
function renderExamQuestion() {
    const question = examQuestions[currentIndex];
    if (!question) return;
    
    // 滚动到顶部
    const questionCard = document.querySelector('#exam-page .question-card');
    if (questionCard) {
        questionCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    // 更新进度
    document.getElementById('exam-current').textContent = currentIndex + 1;
    document.getElementById('exam-total').textContent = examQuestions.length;
    
    const progressPercent = ((currentIndex + 1) / examQuestions.length) * 100;
    document.getElementById('exam-progress-fill').style.width = progressPercent + '%';
    
    // 更新区域提示
    const sectionText = currentIndex < SINGLE_COUNT ? '单选题区' : '多选题区';
    document.getElementById('exam-section').textContent = sectionText;
    
    // 显示题目类型
    const typeElement = document.getElementById('exam-question-type');
    const typeText = question.type === 'multiple' ? '多选题' : '单选题';
    typeElement.textContent = typeText;
    typeElement.className = 'question-type ' + question.type;
    
    // 显示题目内容
    document.getElementById('exam-question-text').textContent = (currentIndex + 1) + '. ' + question.question;
    
    // 渲染选项
    const optionsList = document.getElementById('exam-options-list');
    optionsList.innerHTML = '';
    
    const optionLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    
    question.options.forEach((option, index) => {
        const div = document.createElement('div');
        div.className = 'option-item' + (question.type === 'multiple' ? ' multiple' : '');
        div.innerHTML = `
            <span class="option-marker">${optionLabels[index]}</span>
            <span class="option-text">${option}</span>
        `;
        div.onclick = () => selectExamOption(index);
        optionsList.appendChild(div);
    });
    
    // 恢复已选答案
    if (examAnswers[currentIndex] !== null) {
        const savedAnswers = examAnswers[currentIndex];
        const options = document.querySelectorAll('#exam-options-list .option-item');
        savedAnswers.forEach(idx => {
            options[idx].classList.add('selected');
        });
    }
    
    // 更新按钮状态
    document.getElementById('exam-prev-btn').disabled = currentIndex === 0;
    document.getElementById('exam-next-btn').disabled = currentIndex === examQuestions.length - 1;
    
    // 更新保存按钮文字
    const saveBtn = document.getElementById('exam-save-btn');
    if (currentIndex === examQuestions.length - 1) {
        saveBtn.textContent = '保存答案';
    } else {
        saveBtn.textContent = '保存并下一题';
    }
}

// 选择考试选项
function selectExamOption(index) {
    const question = examQuestions[currentIndex];
    const options = document.querySelectorAll('#exam-options-list .option-item');
    
    if (question.type === 'multiple') {
        // 多选题
        options[index].classList.toggle('selected');
    } else {
        // 单选题
        options.forEach((opt, i) => {
            if (i === index) {
                opt.classList.add('selected');
            } else {
                opt.classList.remove('selected');
            }
        });
    }
}

// 保存当前答案
function saveCurrentExamAnswer() {
    const options = document.querySelectorAll('#exam-options-list .option-item');
    const selected = [];
    options.forEach((opt, idx) => {
        if (opt.classList.contains('selected')) {
            selected.push(idx);
        }
    });
    
    if (selected.length > 0) {
        examAnswers[currentIndex] = selected;
    } else {
        examAnswers[currentIndex] = null;
    }
}

// 保存并下一题
function examSaveAndNext() {
    saveCurrentExamAnswer();
    if (currentIndex < examQuestions.length - 1) {
        currentIndex++;
        renderExamQuestion();
    }
}

// 上一题
function examPrevQuestion() {
    saveCurrentExamAnswer();
    if (currentIndex > 0) {
        currentIndex--;
        renderExamQuestion();
    }
}

// 下一题
function examNextQuestion() {
    saveCurrentExamAnswer();
    if (currentIndex < examQuestions.length - 1) {
        currentIndex++;
        renderExamQuestion();
    }
}

// 开始考试计时器
function startExamTimer() {
    updateTimerDisplay();
    examTimer = setInterval(() => {
        examTimeRemaining--;
        updateTimerDisplay();
        
        if (examTimeRemaining <= 0) {
            clearInterval(examTimer);
            alert('考试时间到！系统将自动交卷。');
            submitExam();
        }
    }, 1000);
}

// 更新计时器显示
function updateTimerDisplay() {
    const hours = Math.floor(examTimeRemaining / 3600);
    const minutes = Math.floor((examTimeRemaining % 3600) / 60);
    const seconds = examTimeRemaining % 60;
    
    const timeText = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    document.getElementById('timer-text').textContent = timeText;
    
    // 最后10分钟警告
    const timerElement = document.querySelector('.exam-timer');
    if (examTimeRemaining <= 600) {
        timerElement.classList.add('warning');
    } else {
        timerElement.classList.remove('warning');
    }
}

// 显示答题卡
function showExamOverview() {
    saveCurrentExamAnswer();
    
    // 生成单选题网格
    const singleGrid = document.getElementById('single-overview-grid');
    singleGrid.innerHTML = '';
    for (let i = 0; i < SINGLE_COUNT; i++) {
        const item = document.createElement('div');
        item.className = 'overview-item';
        item.textContent = i + 1;
        if (examAnswers[i] !== null) {
            item.classList.add('answered');
        }
        if (i === currentIndex) {
            item.classList.add('current');
        }
        item.onclick = () => jumpToQuestion(i);
        singleGrid.appendChild(item);
    }
    
    // 生成多选题网格
    const multiGrid = document.getElementById('multi-overview-grid');
    multiGrid.innerHTML = '';
    for (let i = SINGLE_COUNT; i < examQuestions.length; i++) {
        const item = document.createElement('div');
        item.className = 'overview-item';
        item.textContent = i + 1;
        if (examAnswers[i] !== null) {
            item.classList.add('answered');
        }
        if (i === currentIndex) {
            item.classList.add('current');
        }
        item.onclick = () => jumpToQuestion(i);
        multiGrid.appendChild(item);
    }
    
    document.getElementById('exam-overview-modal').classList.add('show');
}

// 关闭答题卡
function closeExamOverview() {
    document.getElementById('exam-overview-modal').classList.remove('show');
}

// 跳转到指定题目
function jumpToQuestion(index) {
    saveCurrentExamAnswer();
    currentIndex = index;
    renderExamQuestion();
    closeExamOverview();
}

// 确认退出考试
function confirmExitExam() {
    if (confirm('确定要退出考试吗？退出后本次考试进度将不会保存。')) {
        exitExam();
    }
}

// 退出考试
function exitExam() {
    if (examTimer) {
        clearInterval(examTimer);
        examTimer = null;
    }
    examMode = false;
    examQuestions = [];
    examAnswers = [];
    goHome();
}

// 交卷
function submitExam() {
    saveCurrentExamAnswer();
    
    // 统计未答题数
    const unansweredCount = examAnswers.filter(a => a === null).length;
    
    if (unansweredCount > 0) {
        if (!confirm(`还有 ${unansweredCount} 道题未作答，确定要交卷吗？`)) {
            return;
        }
    } else {
        if (!confirm('确定要交卷吗？')) {
            return;
        }
    }
    
    // 停止计时器
    if (examTimer) {
        clearInterval(examTimer);
        examTimer = null;
    }
    
    // 计算成绩
    calculateExamScore();
}

// 计算考试成绩
function calculateExamScore() {
    let singleCorrect = 0;
    let multiCorrect = 0;
    
    // 检查单选题
    for (let i = 0; i < SINGLE_COUNT; i++) {
        const question = examQuestions[i];
        const userAnswer = examAnswers[i];
        
        if (userAnswer !== null && userAnswer.length === 1) {
            if (userAnswer[0] === question.answer) {
                singleCorrect++;
            }
        }
    }
    
    // 检查多选题
    for (let i = SINGLE_COUNT; i < examQuestions.length; i++) {
        const question = examQuestions[i];
        const userAnswer = examAnswers[i];
        
        if (userAnswer !== null) {
            let correctAnswers = question.answer;
            if (!Array.isArray(correctAnswers)) {
                correctAnswers = [correctAnswers];
            }
            
            const userSorted = [...userAnswer].sort();
            const correctSorted = [...correctAnswers].sort();
            
            if (JSON.stringify(userSorted) === JSON.stringify(correctSorted)) {
                multiCorrect++;
            }
        }
    }
    
    // 计算分数
    const singleScore = singleCorrect * SINGLE_SCORE;
    const multiScore = multiCorrect * MULTI_SCORE;
    const totalScore = singleScore + multiScore;
    
    // 计算用时
    const timeUsed = Math.floor((Date.now() - examStartTime) / 1000);
    const hours = Math.floor(timeUsed / 3600);
    const minutes = Math.floor((timeUsed % 3600) / 60);
    const seconds = timeUsed % 60;
    let timeUsedText = '';
    if (hours > 0) {
        timeUsedText = `${hours}小时${minutes}分${seconds}秒`;
    } else if (minutes > 0) {
        timeUsedText = `${minutes}分${seconds}秒`;
    } else {
        timeUsedText = `${seconds}秒`;
    }
    
    // 更新结果页面
    document.getElementById('exam-final-score').textContent = totalScore;
    document.getElementById('single-correct').textContent = singleCorrect;
    document.getElementById('single-score').textContent = singleScore;
    document.getElementById('multi-correct').textContent = multiCorrect;
    document.getElementById('multi-score').textContent = multiScore;
    document.getElementById('exam-time-used').textContent = timeUsedText;
    
    // 判断是否通过
    const passStatus = document.getElementById('pass-status');
    if (totalScore >= PASS_SCORE) {
        passStatus.textContent = '🎉 恭喜通过！';
        passStatus.className = 'pass-status pass';
        document.getElementById('exam-result-title').textContent = '考试通过！';
    } else {
        passStatus.textContent = '😢 未通过';
        passStatus.className = 'pass-status fail';
        document.getElementById('exam-result-title').textContent = '考试结束';
    }
    
    // 显示结果页面
    showPage('exam-result-page');
    
    // 更新学习进度（记录错题）
    examQuestions.forEach((question, index) => {
        const userAnswer = examAnswers[index];
        let isCorrect = false;
        
        if (userAnswer !== null) {
            if (question.type === 'single') {
                isCorrect = userAnswer[0] === question.answer;
            } else {
                let correctAnswers = question.answer;
                if (!Array.isArray(correctAnswers)) {
                    correctAnswers = [correctAnswers];
                }
                const userSorted = [...userAnswer].sort();
                const correctSorted = [...correctAnswers].sort();
                isCorrect = JSON.stringify(userSorted) === JSON.stringify(correctSorted);
            }
        }
        
        if (!isCorrect && !progress.wrong.includes(question.id)) {
            progress.wrong.push(question.id);
        } else if (isCorrect) {
            const wrongIndex = progress.wrong.indexOf(question.id);
            if (wrongIndex > -1) {
                progress.wrong.splice(wrongIndex, 1);
            }
        }
    });
    saveProgress(progress);
}

// 查看考试错题
function reviewExamWrong() {
    // 筛选出答错的题目
    const wrongQuestions = [];
    
    examQuestions.forEach((question, index) => {
        const userAnswer = examAnswers[index];
        let isCorrect = false;
        
        if (userAnswer !== null) {
            if (question.type === 'single') {
                isCorrect = userAnswer[0] === question.answer;
            } else {
                let correctAnswers = question.answer;
                if (!Array.isArray(correctAnswers)) {
                    correctAnswers = [correctAnswers];
                }
                const userSorted = [...userAnswer].sort();
                const correctSorted = [...correctAnswers].sort();
                isCorrect = JSON.stringify(userSorted) === JSON.stringify(correctSorted);
            }
        }
        
        if (!isCorrect) {
            wrongQuestions.push({
                ...question,
                userAnswer: userAnswer
            });
        }
    });
    
    if (wrongQuestions.length === 0) {
        alert('恭喜！本次考试没有错题！');
        return;
    }
    
    // 重置考试状态
    examMode = false;
    
    // 使用普通刷题模式查看错题
    currentQuestions = wrongQuestions;
    currentIndex = 0;
    sessionCorrect = 0;
    sessionWrong = 0;
    showPage('quiz-page');
    renderQuestion();
}
