// 刷题应用主逻辑

// 全局状态
let currentQuestions = [];
let currentIndex = 0;
let selectedOptions = [];
let answered = false;
let sessionCorrect = 0;
let sessionWrong = 0;

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
    const typeText = question.type === 'multiple' ? '多选题' : '单选题';
    document.getElementById('question-type').textContent = typeText;
    
    // 显示题目内容
    document.getElementById('question-text').textContent = question.question;
    
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
